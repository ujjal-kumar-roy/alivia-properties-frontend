import type { Locator, Page } from "@playwright/test"
import { API_URL } from "../playwright.config"
import { expect, type ApiClient } from "./fixtures"

// Helpers shared by the specs. Spec-specific ones stay in their spec.

// ─── Known app bugs ───────────────────────────────────────────────────────────────────────────────────────

/**
 * Confirmed app bugs that a test fails on today. Such a test starts with `test.fail(true, KNOWN_BUG.<name>)`
 * and carries the tag `@known-bug`, so the suite passes while the bug stays visible in the report ("expected to
 * fail"). Once the bug is fixed the test passes, which Playwright reports as a failure: then delete the
 * `test.fail` line, the tag and the entry here, and update the table in README.md.
 */
export const KNOWN_BUG = {
  viewTransitionName:
    "KNOWN BUG: a property page opened at 1024 px or wider mounts two <ViewTransition name=property-<slug>> and React logs two console errors (property-gallery.tsx)",
  apartmentsErrorScreen:
    'KNOWN BUG: /apartments shows "This page couldn\'t load" when the API answers an error, e.g. 400 for an unknown ?sort (apartments/page.tsx)',
  apartmentsTitle: "KNOWN BUG: the apartments list and detail pages have no title of their own (no generateMetadata)",
  megaMenuTap:
    "KNOWN BUG: at 768 px or wider a tap on All categories opens the mega menu and shuts it again (MarketplaceMegaMenu.tsx)",
  bookingStatusCase:
    "KNOWN BUG: the admin bookings status chips send a lowercase status, the API answers 400 and the page shows no bookings (bookings.service.ts)",
  paginationPastEnd:
    'KNOWN BUG: a page past the last one prints an impossible range, e.g. "Showing 511-13 of 13" (table-pagination.tsx)',
  savedHeart:
    "KNOWN BUG: the save heart reads only this browser's localStorage, so a property saved on another device shows as unsaved (use-save-property.ts)",
  sellerViews: "KNOWN BUG: the seller dashboard Views card is always 0, because GET /dashboard/seller sends no totalViews",
  sellerInquiryType:
    "KNOWN BUG: the Type chips on /seller/inquiries change the URL but not the list (the page reads only ?status)",
  usersVerifiedFilter:
    "KNOWN BUG (backend): GET /users ignores verified=true|false, so the Pending verification chip on /admin/sellers lists verified sellers (user-query.dto.ts)",
  loginFormGet:
    "KNOWN BUG: the login form has no method, so a submit before hydration sends GET /login?email=…&password=… (login-form.tsx)",
} as const

/**
 * The two console errors of KNOWN_BUG.viewTransitionName. A test that only starts on a property page and checks
 * something else allows them: test.use({ allowedErrors: VIEW_TRANSITION_ERRORS }). Delete with the bug.
 */
export const VIEW_TRANSITION_ERRORS = [
  /<ViewTransition name=.*(same name mounted at the same time|duplicate has this stack trace)/,
]

// ─── Pages ────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Opens `path` and returns once its HTML has arrived ("domcontentloaded"). The default wait for "load" also
 * waits for every eager image, which `next dev` fetches and resizes first; the assertions that follow wait for
 * what they need. Before the first click or keystroke on a client component, wait for `hydrated()` as well.
 */
export function open(page: Page, path: string) {
  return page.goto(path, { waitUntil: "domcontentloaded" })
}

/** `open` for a signed-in page, failing at once when the saved login no longer works (it lands on /login). */
export async function openSignedIn(page: Page, path: string) {
  await open(page, path)
  await expect(page, `the saved login should open ${path}; if it has expired, run the setup project`).not.toHaveURL(
    /\/login(\?|$)/,
  )
}

/**
 * Opens a property page and returns once React has hydrated it. The page's first act after hydration is its
 * view ping (POST <api>/properties/:id/view, which the fixtures answer themselves), so after this a click is not
 * lost and any hydration error has been logged. The ping is sent once per property per browser session, so use
 * it for the first visit to a property in a test.
 */
export async function openProperty(page: Page, slug: string) {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && /\/properties\/[^/]+\/view$/.test(new URL(response.url()).pathname),
    ),
    open(page, `/properties/${slug}`),
  ])
}

/** Runs in the page: React keeps an element's props under a `__reactProps$…` key once it has hydrated it. */
const isHydrated = (element: Element) => Object.keys(element).some((key) => key.startsWith("__reactProps$"))

/**
 * Waits until React has hydrated `control` (the first match). Under `next dev` the server HTML is on screen
 * well before React takes over, and a click or keystroke in that gap is lost; a form is even sent by the
 * browser itself. The login setup waits the same way.
 */
export async function hydrated(control: Locator) {
  const element = control.first()
  await expect(element).toBeAttached()
  await expect
    .poll(() => element.evaluate(isHydrated, undefined, { timeout: 5_000 }).catch(() => false), {
      message: "React never hydrated the control, so using it would do nothing",
      timeout: 60_000,
    })
    .toBe(true)
}

/**
 * For the first check after a click that opens another route. `next dev` compiles a route on its first visit,
 * which takes more than a minute on a busy machine; `page.goto` already gets the config's navigationTimeout.
 */
export const COMPILE = { timeout: 90_000 }

// ─── Locators ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A control that only navigates, whether the app renders it as a link or as an anchor with role="button"
 * (Base UI's `<Button render={<Link />}>` does that).
 */
export const linkOrButton = (scope: Page | Locator, name: string | RegExp) =>
  scope.getByRole("link", { name, exact: true }).or(scope.getByRole("button", { name, exact: true }))

/** The "Showing 1-10 of 47" line under a dashboard table. The phone layout prints a hidden copy, so keep the visible one. */
export const pagerLine = (page: Page) => page.getByText(/^\s*Showing \d+-\d+ of \d+\s*$/).filter({ visible: true })

export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** A record id that is well formed but belongs to nothing. */
export const MISSING_ID = "0".repeat(24)

// ─── The API ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * GETs `path` (relative to API_URL, no leading slash) and returns the parsed body: `{ data }`, or `{ data, meta }`
 * for lists. Works with `apiAs(role)` and with the anonymous `request` fixture of any project. Any status but
 * 200 fails the test; a 429 means the API runs with its default throttle (see README.md).
 */
export async function getJson<T>(api: ApiClient, path: string): Promise<T> {
  const response = await api.get(`${API_URL}/${path}`)
  if (response.status() !== 200) {
    const throttled =
      response.status() === 429 ? " (the API is throttling: restart it with THROTTLE_LIMIT=100000, see e2e/README.md)" : ""
    const body = (await response.text()).slice(0, 300)
    expect(response.status(), `GET ${path}${throttled}: ${body}`).toBe(200)
  }
  return (await response.json()) as T
}

/** `getJson` for a `{ data }` envelope: returns `data`. */
export async function getData<T>(api: ApiClient, path: string): Promise<T> {
  return (await getJson<{ data: T }>(api, path)).data
}
