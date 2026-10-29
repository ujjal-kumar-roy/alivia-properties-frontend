import fs from "node:fs"
import { test as base, expect, type Request } from "@playwright/test"
import { API_URL, BASE_URL } from "../playwright.config"
import { authFile, type Role } from "./accounts"

type Options = {
  /**
   * Expected errors. Each collected line ("[console] …", "[pageerror] …", "[response] GET <url> -> 404 Not Found")
   * that matches one of these is ignored: test.use({ allowedErrors: [/\/pre-approval\/me.*404/] }).
   */
  allowedErrors: RegExp[]
  /**
   * Writes the browser may send in this test, matched against "<METHOD> <url>". Any other POST, PUT, PATCH or
   * DELETE from the browser fails the test, and one aimed at the API is blocked before it gets there: the suite
   * runs on the owner's real data. Only self-cleaning tests allow one: test.use({ allowedWrites: [/\/save$/] }).
   */
  allowedWrites: RegExp[]
}

type Fixtures = {
  /** Automatic: collects browser errors during the test and fails the test at the end if any are unexpected. */
  browserErrors: string[]
  /** Automatic: collects the browser's write requests and fails the test at the end if any were not allowed. */
  browserWrites: string[]
  /**
   * An API client signed in as `role` (Authorization: Bearer <token>), reusing the setup's saved login.
   * Paths are relative to API_URL, so no leading slash: `(await apiAs("buyer")).get("auth/me")`.
   */
  apiAs: (role: Role) => Promise<ApiClient>
}

/** What a test needs from an API response. Playwright's own APIResponse has all of it. */
export interface ApiResponse {
  status(): number
  statusText(): string
  ok(): boolean
  url(): string
  headers(): Record<string, string>
  text(): Promise<string>
  json(): Promise<unknown>
}

export type ApiRequestOptions = {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  timeout?: number
}

/** What a test needs from an API client. Playwright's `request` fixture and `apiAs(role)` both have it. */
export interface ApiClient {
  get(url: string, options?: ApiRequestOptions): Promise<ApiResponse>
  post(url: string, options?: ApiRequestOptions): Promise<ApiResponse>
  delete(url: string, options?: ApiRequestOptions): Promise<ApiResponse>
}

const APP = new URL(BASE_URL)
/** The API root with a trailing slash, so relative paths resolve under it: "auth/me" -> …/api/v1/auth/me. */
const API = new URL(`${API_URL}/`)

const isApiUrl = (url: URL) => url.origin === API.origin
/** Failed responses and writes count only from these origins: the Next.js app and the API. */
const isAppUrl = (url: string) => URL.canParse(url) && [APP.origin, API.origin].includes(new URL(url).origin)

/**
 * The browser's view pings: POST <api>/properties/:id/view (sent by the property page once it hydrates), and the
 * same for projects and blog posts should they ever move to the browser. The fixture answers them itself, so test
 * runs do not inflate the owner's view counts. (Apartment and article pages count their view on the Next server,
 * which the browser cannot intercept; see README.md.)
 */
const isViewPing = (url: URL) =>
  isApiUrl(url) &&
  url.pathname.startsWith(API.pathname) &&
  /^(properties|projects|blog)\/[^/]+\/view$/.test(url.pathname.slice(API.pathname.length))

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

/** Writes that change no data: the NextAuth session, the notification socket, Next's dev tooling. */
function isHarmlessWrite(url: URL, request: Request) {
  if (/^\/(api\/auth\/|socket\.io\/|__nextjs|_next\/)/.test(url.pathname)) return true
  // The marketplace category page loads its next pages through read-only server functions
  // (src/app/marketplace/category/[slug]/actions.ts), which Next sends as POSTs.
  return url.pathname.startsWith("/marketplace/category/") && request.headers()["next-action"] !== undefined
}

const extended = base.extend<Options & Fixtures>({
  allowedErrors: [[], { option: true }],
  allowedWrites: [[], { option: true }],

  browserErrors: [
    async ({ allowedErrors }, use) => {
      const lines: string[] = []
      await use(lines)

      const unexpected = lines.filter((line) => !allowedErrors.some((pattern) => pattern.test(line)))
      if (unexpected.length > 0) {
        throw new Error(
          `${unexpected.length} unexpected browser error(s):\n${unexpected.map((line) => `  ${line}`).join("\n")}\n` +
            "If one is expected, allow it with test.use({ allowedErrors: [/pattern/] }).",
        )
      }
    },
    { auto: true },
  ],

  browserWrites: [
    async ({ allowedWrites }, use) => {
      const lines: string[] = []
      await use(lines)

      const unexpected = lines.filter((line) => !allowedWrites.some((pattern) => pattern.test(line)))
      if (unexpected.length > 0) {
        throw new Error(
          `${unexpected.length} write request(s) from the browser:\n${unexpected.map((line) => `  ${line}`).join("\n")}\n` +
            "The suite runs on the owner's real data. A test that must write, and cleans up after itself, " +
            "allows it with test.use({ allowedWrites: [/pattern/] }).",
        )
      }
    },
    { auto: true },
  ],

  // Listens on the whole context, so popups count too. Tests that never touch `page` or `context`
  // (the `api` project) never create one, so no browser starts for them.
  context: async ({ context, browserErrors, browserWrites, allowedWrites }, use) => {
    await context.route(
      (url) => isApiUrl(url),
      async (route, request) => {
        const url = new URL(request.url())
        if (request.method() === "POST" && isViewPing(url)) {
          await route.fulfill({
            status: 200,
            headers: { "access-control-allow-origin": APP.origin, "access-control-allow-credentials": "true" },
            json: { data: { success: true } },
          })
          return
        }
        const line = `${request.method()} ${request.url()}`
        if (
          WRITE_METHODS.has(request.method()) &&
          !isHarmlessWrite(url, request) &&
          !allowedWrites.some((pattern) => pattern.test(line))
        ) {
          browserWrites.push(`${line} (blocked)`)
          await route.abort("blockedbyclient")
          return
        }
        await route.fallback()
      },
    )

    context.on("console", (message) => {
      if (message.type() !== "error") return
      const { url } = message.location()
      // Chrome echoes each failed request as a console error; the [response] line already covers app requests.
      if (message.text().startsWith("Failed to load resource: the server responded") && isAppUrl(url)) return
      browserErrors.push(`[console] ${message.text()}${url ? ` (${url})` : ""}`)
    })
    context.on("weberror", (webError) => browserErrors.push(`[pageerror] ${webError.error()}`))
    context.on("response", (response) => {
      if (response.status() < 400 || !isAppUrl(response.url())) return
      browserErrors.push(
        `[response] ${response.request().method()} ${response.url()} -> ${response.status()} ${response.statusText()}`,
      )
    })
    // Writes to the API are caught (and blocked) by the route above; this records the ones sent to the Next app.
    context.on("request", (request) => {
      if (!WRITE_METHODS.has(request.method()) || !isAppUrl(request.url())) return
      const url = new URL(request.url())
      if (isApiUrl(url) || isHarmlessWrite(url, request)) return
      browserWrites.push(`${request.method()} ${request.url()}`)
    })
    await use(context)
  },

  apiAs: async ({}, use) => {
    await use(async (role) => apiClient(role, await accessToken(role)))
  },
})

// Playwright reads an array whose second item is an object as a [value, options] pair, so
// test.use({ allowedErrors: [/a/, /b/] }) would silently keep only /a/. Hand each list over whole.
const LIST_OPTIONS = ["allowedErrors", "allowedWrites"] as const
const use = extended.use
extended.use = (fixtures) => {
  const patched: Record<string, unknown> = { ...fixtures }
  for (const name of LIST_OPTIONS) {
    const list = fixtures[name]
    if (Array.isArray(list) && list.every((item) => item instanceof RegExp)) patched[name] = [list, { scope: "test" }]
  }
  use(patched as typeof fixtures)
}

export const test = extended
export { expect }

// ─── apiAs: a Bearer client that never shows its token ────────────────────────────────────────────────────
//
// Built on Node's fetch, not on Playwright's APIRequestContext: when a Playwright request fails, its call log
// (printed in the terminal, the HTML report and error-context.md) lists every request header, Authorization
// included, and traces record them too. fetch errors carry no headers. Each call still shows up as a step
// in the HTML report.

const tokens = new Map<Role, Promise<string>>()

/** The backend access token of the role's saved login, read once per worker from the NextAuth session. */
function accessToken(role: Role): Promise<string> {
  let token = tokens.get(role)
  if (!token) {
    token = readAccessToken(role)
    tokens.set(role, token)
    token.catch(() => tokens.delete(role))
  }
  return token
}

/** Reads the role's saved login and asks NextAuth for the session, which carries the backend access token. */
async function readAccessToken(role: Role): Promise<string> {
  const file = authFile(role)
  if (!fs.existsSync(file)) {
    throw new Error(`No saved ${role} login at ${file}. Run the setup project first (it runs as a dependency).`)
  }
  const { cookies } = JSON.parse(fs.readFileSync(file, "utf8")) as { cookies: { name: string; value: string; domain: string }[] }
  const cookie = cookies
    .filter(({ domain }) => domain.replace(/^\./, "") === APP.hostname)
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ")

  let session: { accessToken?: string } | null
  try {
    const response = await fetch(new URL("/api/auth/session", APP), { headers: { cookie } })
    session = (await response.json()) as { accessToken?: string } | null
  } catch (error) {
    throw new Error(`Could not read the saved ${role} session from ${APP.origin}/api/auth/session: ${reasonOf(error)}`)
  }
  if (!session?.accessToken) {
    throw new Error(`The saved ${role} session has no access token. Delete e2e/.auth/${role}.json and rerun.`)
  }
  return session.accessToken
}

function apiClient(role: Role, token: string): ApiClient {
  const send = (method: "GET" | "POST" | "DELETE") => (path: string, options: ApiRequestOptions = {}) =>
    base.step(`${method} ${path} as ${role}`, () => request(method, path, token, role, options), { box: true })
  return { get: send("GET"), post: send("POST"), delete: send("DELETE") }
}

async function request(
  method: string,
  path: string,
  token: string,
  role: Role,
  { headers, params, timeout = 30_000 }: ApiRequestOptions,
): Promise<ApiResponse> {
  const url = new URL(path, API)
  for (const [name, value] of Object.entries(params ?? {})) url.searchParams.set(name, String(value))

  let response: Response
  let body: Buffer
  try {
    response = await fetch(url, {
      method,
      headers: { accept: "application/json", ...headers, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeout),
    })
    body = Buffer.from(await response.arrayBuffer())
  } catch (error) {
    // The token is in no part of this message.
    throw new Error(`${method} ${url} as ${role} got no answer: ${reasonOf(error)}`)
  }

  const text = body.toString("utf8")
  return {
    status: () => response.status,
    statusText: () => response.statusText,
    ok: () => response.ok,
    url: () => response.url,
    headers: () => Object.fromEntries(response.headers),
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  }
}

/** Why a fetch failed, e.g. "ECONNREFUSED" or "timed out", without the request it was making. */
function reasonOf(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  if (error.name === "TimeoutError" || error.name === "AbortError") return "timed out"
  const cause = error.cause as { code?: string; message?: string } | undefined
  return cause?.code ?? cause?.message ?? error.message
}
