import { defineConfig, devices } from "@playwright/test"
import { authFile, type Role } from "./e2e/accounts"
import { LS_COOKIE_CONSENT } from "./src/lib/constants"

/** The Next.js app under test. */
export const BASE_URL = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "")

/** The NestJS API, without a trailing slash. Specs import it: `${API_URL}/health`. */
export const API_URL = (process.env.E2E_API_URL ?? "http://localhost:3001/api/v1").replace(/\/+$/, "")

/**
 * The cookie banner's consent, already given ("declined"), so the banner never covers controls.
 * The banner keeps it in localStorage (src/components/common/cookie-consent-banner.tsx). Public tests
 * start from this state; the setup logs in on top of it, so every saved role state carries it too.
 */
export const CONSENT_STATE = {
  cookies: [],
  origins: [{ origin: new URL(BASE_URL).origin, localStorage: [{ name: LS_COOKIE_CONSENT, value: "declined" }] }],
}

/**
 * `<name>.*spec.ts` (e.g. buyer.spec.ts, seller.listings.spec.ts), matched from the start of the file
 * name, so `api.buyer.spec.ts` runs only in `api`.
 */
const specsOf = (name: string) => new RegExp(String.raw`(^|[\\/])${name}\..*spec\.ts$`)

/** Browser smoke test, run once by each browser project (see smoke.spec.ts). */
const SMOKE = /(^|[\\/])smoke\.spec\.ts$/

const signedIn = (role: Role) => ({
  name: role,
  testMatch: [specsOf(role), SMOKE],
  use: { storageState: authFile(role) },
  dependencies: ["setup"],
})

export default defineConfig({
  testDir: "./e2e",
  // The API must already run (with THROTTLE_LIMIT=100000); this stops the run at once if it does not.
  globalSetup: "./e2e/global-setup.ts",
  // `next dev` compiles a route on its first hit (15-20 s for signed-in routes), even when a click
  // (not page.goto) gets there, and the machine is often loaded, so leave headroom:
  // 60 s per navigation, 20 s per expect, 120 s per test.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 2 : 0,
  // One machine serves the app, the API and the browsers: 2 by default (at most 4, via --workers).
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: BASE_URL,
    navigationTimeout: 60_000,
    // Off: a trace records the session cookie and the Bearer tokens the browser sends. To debug one test
    // locally, add --trace=on, and delete the trace afterwards.
    trace: "off",
    screenshot: "only-on-failure",
  },
  // `setup` is listed last: UI mode (--ui) preselects the first project it loads, and dependencies run first anyway.
  projects: [
    { name: "public", testMatch: [specsOf("public"), SMOKE], use: { storageState: CONSENT_STATE } },
    signedIn("buyer"),
    signedIn("seller"),
    signedIn("admin"),
    {
      // Backend API tests: no browser, just the `request` fixture and `apiAs(role)`.
      name: "api",
      testMatch: specsOf("api"),
      use: { baseURL: `${API_URL}/` },
      dependencies: ["setup"],
    },
    {
      name: "setup",
      testMatch: /(^|[\\/])auth\.setup\.ts$/,
      // No traces of the login form: they would record the typed password.
      use: { storageState: CONSENT_STATE, trace: "off" },
    },
  ],
  // Only the frontend: a running `next dev` is reused. The API is never started from here (see e2e/global-setup.ts).
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    timeout: 180_000,
    reuseExistingServer: true,
  },
})
