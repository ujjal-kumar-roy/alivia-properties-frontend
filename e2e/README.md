# End-to-end tests (Playwright)

The suite drives the Next.js app at `E2E_BASE_URL` (default `http://localhost:3000`) and the NestJS API at
`E2E_API_URL` (default `http://localhost:3001/api/v1`), against whatever database the API uses: today the
owner's real dev data.

## Before you run it

1. **Start the API with the raised throttle limit**, from `alivia-properties-backend/`:
   `THROTTLE_LIMIT=100000 pnpm start:dev`. At the default 120 requests a minute the server-rendered pages get
   429s and show empty lists. The suite never starts the API: `global-setup.ts` stops the run at once when
   `GET /health` does not answer 200, or when the API still runs with a low limit. Logins stay at 5 a minute
   for the whole machine.
2. **Start the app**: `pnpm dev` here. If nothing answers on `:3000`, Playwright starts it (and reuses a running one).
3. The seeded demo accounts must exist (`pnpm db:seed` in the backend). See [Accounts](#accounts).

## Running

From `alivia-properties-frontend/`:

```bash
pnpm test:e2e                                          # everything (same as: pnpm exec playwright test)
pnpm exec playwright test --project=admin              # one project: setup, public, buyer, seller, admin, api
pnpm exec playwright test e2e/buyer.spec.ts            # one file
pnpm exec playwright test -g "pages through"           # tests whose title matches
pnpm exec playwright test --grep-invert @known-bug     # leave out the tests of known app bugs
pnpm exec playwright test --grep-invert @counts-view   # leave out the tests that add a view on the server
pnpm exec playwright test --no-deps --workers=1        # reuse the saved logins (e2e/.auth/), one test at a time
pnpm exec playwright show-report                       # the last HTML report
pnpm exec playwright test --project=buyer --ui         # watch tests in Playwright's UI window
```

- Run these from `alivia-properties-frontend/`, always through `pnpm` (`pnpm exec playwright` or `pnpm test:e2e`):
  Playwright is installed only in this project, so a bare `playwright` is "command not found".
- In `--ui`, the Projects list (top left) decides which tests show. It preselects the first project loaded (`setup`
  is listed last for that reason); tick the ones you want and the UI remembers them.

- `--no-deps` keeps `setup` from running first as a dependency of the projects you pick; saved logins stay valid for
  days (30-day tokens). A run without `--project` still includes `setup` itself, which logs in again only for a saved
  login older than 10 minutes.
- On a busy machine use `--workers=1` (the default is 2). Timeouts allow for `next dev` compiling a route on its
  first hit: 60 s per navigation, 20 s per `expect`, 120 s per test.
- Several runs at once on this checkout overwrite each other's `test-results/` and `playwright-report/`; give each
  its own `--output=<dir>` and `PLAYWRIGHT_HTML_OUTPUT_DIR=<dir>`.
- Traces are off: a trace records the session cookie and the Bearer tokens the browser sends. To debug one test,
  add `--trace=on` locally and delete the trace afterwards. Never trace the `setup` project (it types a password).

| Project  | Files                                  | Signed in as                    |
|----------|----------------------------------------|---------------------------------|
| `setup`  | `auth.setup.ts`                        | logs in each role, saves state  |
| `public` | `public.*spec.ts`, `smoke.spec.ts`     | nobody                          |
| `buyer`  | `buyer.*spec.ts`, `smoke.spec.ts`      | `e2e/.auth/buyer.json`          |
| `seller` | `seller.*spec.ts`, `smoke.spec.ts`     | `e2e/.auth/seller.json`         |
| `admin`  | `admin.*spec.ts`, `smoke.spec.ts`      | `e2e/.auth/admin.json`          |
| `api`    | `api.*spec.ts` (no browser starts)     | Bearer tokens via `apiAs(role)` |

## Known app bugs

Each test below asserts the correct behaviour and fails today because of a confirmed app bug. It is marked
`test.fail(true, KNOWN_BUG.<name>)` and tagged `@known-bug`, so the run passes and the report lists it as an
expected failure. **When the bug is fixed, the test passes and Playwright reports it as failed**: then delete the
`test.fail` line, the tag and the entry in `KNOWN_BUG` (`helpers.ts`), and the row here.

| Bug | Test |
|-----|------|
| A property page at 1024 px or wider mounts two `<ViewTransition name=property-<slug>>`; React logs two console errors (`property-gallery.tsx`) | `public.properties.spec.ts:327` property detail › shows the title, price and seller card, without an email address<br>`public.properties.spec.ts:357` property detail › describes the property: facts, description, facilities and location<br>`buyer.spec.ts:328` property page › shows the listing to a signed-in buyer with its seller card, save and compare |
| `/apartments` shows "This page couldn't load" when the API answers an error, e.g. 400 for an unknown `?sort` | `public.apartments.spec.ts:264` apartments sorting › an unknown sort in the URL falls back to the default list instead of an error page |
| The apartments list and detail pages have no title of their own | `public.apartments.spec.ts:554` apartment page titles › the listing's browser tab says it shows apartments<br>`public.apartments.spec.ts:561` apartment page titles › an apartment's browser tab carries its name |
| At 768 px or wider a tap on All categories opens the mega menu and shuts it again | `public.marketplace.spec.ts:336` marketplace home › on a tablet-width touch screen › opens the All Categories menu with a tap |
| The login form has no `method`, so a submit before hydration sends `GET /login?email=…&password=…` | `public.content.spec.ts:377` account pages › the sign-in form can never put the password in the address bar |
| The save heart reads only this browser's localStorage, so a property saved on another device shows as unsaved | `buyer.spec.ts:419` property page › save › shows a property saved in another browser as saved on the saved-properties page |
| The seller dashboard Views card is always 0 (`GET /dashboard/seller` sends no `totalViews`) | `seller.listings.spec.ts:166` seller dashboard › shows total views at least as high as the views on its recent listings |
| The Type chips on `/seller/inquiries` change the URL but not the list | `seller.listings.spec.ts:542` seller inquiries › narrows the list to the type of the first inquiry |
| Backend: `GET /users` ignores `verified=true\|false`, so the Pending verification chip lists verified sellers | `admin.core.spec.ts:412` admin sellers › lists only sellers still awaiting verification under the Pending verification chip |
| A page past the last one prints an impossible range ("Showing 511-13 of 13") | `admin.operations.spec.ts:442` inquiries › does not print an impossible range for a page past the end |
| The admin bookings status chips send a lowercase status; the API answers 400 and the page shows no bookings | `admin.operations.spec.ts:531` bookings › filters bookings to a status that has bookings |

## Data safety

The only writes are self-cleaning saves of one listing by the demo buyer: `buyer.spec.ts` › property page › save
(two tests; an `afterEach` unsaves even after a failure or a timeout) and `api.spec.ts` › saved listings (unsaves in
`finally`). The two use different listings, and no test asserts an empty saved list or a saved total.

- Nothing else submits a form or presses a button that creates, changes or deletes data.
- The fixtures enforce it in the browser: a POST, PUT, PATCH or DELETE the test did not allow fails the test, and one
  aimed at the API is blocked before it gets there. A test that must write, and cleans up, allows it with
  `test.use({ allowedWrites: [/pattern/] })`.
- **View counts.** The fixtures answer the browser's view pings themselves (`POST <api>/properties/:id/view`, and
  the same for projects and blog posts), so test runs add no property views. Apartment and blog-article pages count
  their view on the Next server, which the browser cannot intercept. The tests that open one are tagged
  `@counts-view`; a full run adds 13 views to apartments (today all to `alivia-heights-2`) and 1 to the blog
  article. Leave them out with `--grep-invert @counts-view`.

## Accounts

The three demo accounts the backend seed creates. `accounts.ts` looks up each role's email and password in this
order: `E2E_<ROLE>_EMAIL` / `E2E_<ROLE>_PASSWORD` environment variables, then `SEED_<ROLE>_EMAIL` /
`SEED_<ROLE>_PASSWORD` in `../alivia-properties-backend/.env`, then the seed defaults (`buyer@alivia.local`,
`seller@alivia.local`, `admin@alivia.local`).

Only the `setup` project logs in, one role at a time, through the real `/login` page; it reuses a login saved less
than 10 minutes ago, and on a "too many requests" refusal waits a minute and retries once. Specs never log in: they
use the project's saved state, or `apiAs(role)`, which reads the access token from that saved session. Delete
`e2e/.auth/` to force fresh logins.

## Writing a spec

```ts
import { test, expect } from "./fixtures"
import { getData, hydrated, open } from "./helpers"

test("the Pending chip lists the pending listings", async ({ page }) => {
  await open(page, "/seller/properties")
  const pending = page.getByRole("group", { name: "Status" }).getByRole("button", { name: "Pending" })
  await hydrated(pending)
  await pending.click()

  await expect(page).toHaveURL(/[?&]status=pending/)
  await expect(pending).toHaveAttribute("aria-pressed", "true")
})

test("the seller's dashboard counts come from the API", async ({ apiAs }) => {
  const stats = await getData<{ totalListings: number }>(await apiAs("seller"), "dashboard/seller")
  expect(stats.totalListings).toBeGreaterThan(0)
})
```

- Import `test` and `expect` from `./fixtures`, and the shared helpers from `./helpers`: `open` (navigate, wait for
  the HTML), `hydrated` (wait until React has taken over a control before clicking or typing in it: a click before
  that is lost), `getJson` / `getData` (API reads that fail on anything but 200), `linkOrButton`, `pagerLine`,
  `COMPILE` (a longer wait for the first visit to a route after a click), `KNOWN_BUG`.
- **Browser errors fail the test**: console errors, uncaught page errors and responses of 400 or more from the app
  or the API. Allow an expected one per file or `describe`: `test.use({ allowedErrors: [/\/pre-approval\/me.*404/] })`.
- **Assert the data, not just "no error".** Many pages load their data on the Next server and turn an API error into
  an empty list, which the browser never sees. Ask the API what the page should show (`apiAs(role)` or `request`) and
  check the page shows it; accept an empty state only when the API says there is nothing.
- **API paths have no leading slash**: `getJson(api, "auth/me")`, `api.get("auth/me")`.
- Never print a password or a token: not in titles, messages or logs. `apiAs` is built on `fetch`, so a failed call
  never shows its Authorization header.
