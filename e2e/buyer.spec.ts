import type { Page } from "@playwright/test"
import { DASHBOARD_PAGE_SIZE, LS_RECENT_SEARCHES } from "../src/lib/constants"
import { account } from "./accounts"
import { expect, test, type ApiClient, type ApiResponse } from "./fixtures"
import {
  KNOWN_BUG,
  VIEW_TRANSITION_ERRORS,
  getData,
  getJson,
  hydrated,
  linkOrButton,
  open,
  openProperty,
  pagerLine,
} from "./helpers"

// The buyer area. Runs as the buyer with the login the setup project saved; nothing here logs in.
//
// Data safety (this is the owner's real data): the only writes save one property for the buyer, in the
// two tests of the "save" group, and an afterEach hook unsaves it after each. Every other test reads.
// The `api` project saves another property at the same time, so no test here asserts an empty saved
// list or a saved total: each looks at its own property only.
//
// Several dashboard pages turn an API error into an empty state on the server, where the error
// collector can't see it. So the tests ask the API what the buyer has and check the page shows it.

const buyer = account("buyer")

/** The listing for the save round trip. The `api` spec saves a different property at the same time. */
const PROPERTY_SLUG = "4-bed-apartment-for-sale-in-khalishpur-khalishpur"

type Paged<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }
type Me = { name: string; email: string; phone?: string | null }
type BuyerStats = { savedCount: number; totalInquiries: number; totalBookings: number }
type ApiProperty = { id: string; title: string; slug: string }
type ApiInquiry = {
  id: string
  message: string
  propertyTitle?: string | null
  property?: { title: string } | null
  projectName?: string | null
  project?: { name: string } | null
}

/** The buyer's sidebar, in order: the link's name, where it goes, and the h1 of that page. */
const WORKSPACE_PAGES = [
  { link: "Dashboard", href: "/buyer/dashboard", heading: "Buyer Dashboard" },
  { link: "Saved Properties", href: "/buyer/saved-properties", heading: "Saved Properties" },
  { link: "Recent Searches", href: "/buyer/recent-searches", heading: "Recent Searches" },
  { link: "Inquiries", href: "/buyer/inquiries", heading: "My Inquiries" },
  { link: "Marketplace Quotes", href: "/buyer/marketplace-quotes", heading: "Marketplace Quotes" },
  { link: "Bookings", href: "/buyer/bookings", heading: "My Bookings" },
  { link: "Profile", href: "/buyer/profile", heading: "Profile" },
]

const sidebar = (page: Page) => page.getByRole("complementary", { name: "Buyer Workspace navigation" })

/** A dashboard tile is one link named "<label> <count>". `count` is a number or a pattern like "\\d+". */
const tile = (page: Page, label: string, count: number | string) =>
  page.getByRole("link", { name: new RegExp(`^${label}\\s*${count}$`) })

/**
 * A dashboard table shows what the API holds for the buyer: one row per record on the page and a
 * "Showing 1-n of total" line, or the empty message when there are none.
 */
async function expectTableToMatch(page: Page, total: number, emptyMessage: string) {
  const empty = page.getByRole("cell", { name: emptyMessage })
  if (total === 0) {
    await expect(empty).toBeVisible()
    return
  }
  const shown = Math.min(total, DASHBOARD_PAGE_SIZE)
  await expect(page.getByRole("row")).toHaveCount(shown + 1) // the header row, then one per record
  await expect(empty).toHaveCount(0)
  await expect(pagerLine(page)).toHaveText(`Showing 1-${shown} of ${total}`)
}

/** The property page has the gallery's button first; the similar-properties cards below have their own. */
const heartOnPage = (page: Page) => page.getByRole("button", { name: "Save property" }).first()

const savedCard = (page: Page, title: string) =>
  page.getByRole("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) })

/** Resolves with the save (POST) or unsave (DELETE) call for the property. */
const saveCall = (page: Page, method: "POST" | "DELETE", propertyId: string) =>
  page.waitForResponse(
    (response) => response.request().method() === method && response.url().endsWith(`/properties/${propertyId}/save`),
  )

async function isSavedOnServer(api: ApiClient, propertyId: string) {
  const saved = await getJson<Paged<{ id: string }>>(api, "properties/me/saved?page=1&limit=100")
  return saved.data.some((property) => property.id === propertyId)
}

/** For both an API call and a response the browser saw. */
function expectOk(response: Pick<ApiResponse, "ok" | "status">, what: string) {
  expect(response.ok(), `${what} answered ${response.status()}`).toBe(true)
}

/** Starts a save test from a known state: a run that died half way may have left the property saved. */
async function startUnsaved(api: ApiClient, property: ApiProperty) {
  await api.delete(`properties/${property.id}/save`)
  expect(await isSavedOnServer(api, property.id), "the property starts unsaved").toBe(false)
}

test.describe("buyer workspace", () => {
  test("shows the dashboard with a greeting, four activity tiles and the sidebar", async ({ page, apiAs }) => {
    const api = await apiAs("buyer")
    const me = await getData<Me>(api, "users/me")
    const stats = await getData<BuyerStats>(api, "dashboard/buyer")

    await open(page, buyer.dashboard)

    await expect(page.getByRole("heading", { level: 1, name: buyer.dashboardHeading })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: `Hi ${me.name.split(" ")[0]}` })).toBeVisible()
    await expect(page.getByRole("button", { name: "Account menu" })).toContainText(me.name)

    // Inquiries and bookings come from the API. Saved properties also read this browser's list, and
    // the `api` spec saves a property at the same time, so only the shape of those two is checked.
    await expect(tile(page, "My Inquiries", stats.totalInquiries)).toHaveAttribute("href", "/buyer/inquiries")
    await expect(tile(page, "My Bookings", stats.totalBookings)).toHaveAttribute("href", "/buyer/bookings")
    await expect(tile(page, "Saved Properties", String.raw`\d+`)).toHaveAttribute("href", "/buyer/saved-properties")
    await expect(tile(page, "Recent Searches", String.raw`\d+`)).toHaveAttribute("href", "/buyer/recent-searches")

    for (const { link, href } of WORKSPACE_PAGES) {
      await expect(sidebar(page).getByRole("link", { name: link, exact: true })).toHaveAttribute("href", href)
    }
    await expect(sidebar(page).getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  test("moves between the workspace pages from the sidebar", async ({ page }) => {
    test.slow() // seven routes, each compiled on its first visit in `next dev`
    await open(page, buyer.dashboard)

    for (const { link, href, heading } of WORKSPACE_PAGES.slice(1)) {
      const entry = sidebar(page).getByRole("link", { name: link, exact: true })
      await entry.click()

      await expect(page).toHaveURL(href)
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
      await expect(entry).toHaveAttribute("aria-current", "page")
    }
  })

  test("shows saved properties, or the empty state when nothing is saved", async ({ page }) => {
    await open(page, "/buyer/saved-properties")

    await expect(page.getByRole("heading", { level: 1, name: "Saved Properties" })).toBeVisible()
    await expect(linkOrButton(page, "Browse Listings").first()).toHaveAttribute("href", "/properties")
    // None at rest, but the `api` spec may hold one saved right now: either way one of the two shows.
    const emptyState = page.getByText("No saved properties yet")
    await expect(emptyState.or(page.getByRole("article").first())).toBeVisible()
  })

  test("lists the buyer's inquiries as a table that matches the API", async ({ page, apiAs }) => {
    const api = await apiAs("buyer")
    const inquiries = await getJson<Paged<ApiInquiry>>(api, `inquiries?page=1&limit=${DASHBOARD_PAGE_SIZE}`)

    await open(page, "/buyer/inquiries")

    await expect(page.getByRole("heading", { level: 1, name: "My Inquiries" })).toBeVisible()
    for (const column of ["Subject", "Message", "Status", "Sent", "Actions"]) {
      await expect(page.getByRole("columnheader", { name: column })).toBeVisible()
    }
    await expectTableToMatch(page, inquiries.meta.total, "No records found.")
  })

  test("opens the first inquiry with its subject and message", async ({ page, apiAs }) => {
    const api = await apiAs("buyer")
    const inquiries = await getJson<Paged<ApiInquiry>>(api, `inquiries?page=1&limit=${DASHBOARD_PAGE_SIZE}`)
    test.skip(inquiries.meta.total === 0, "the buyer has no inquiries to open")
    const [first] = inquiries.data
    const subject =
      first.propertyTitle ?? first.property?.title ?? first.projectName ?? first.project?.name ?? "General inquiry"

    await open(page, "/buyer/inquiries")
    await linkOrButton(page.getByRole("row").filter({ has: page.getByRole("cell") }).first(), "View").click()

    await expect(page).toHaveURL(new RegExp(`/buyer/inquiries/${first.id}$`))
    await expect(page.getByRole("heading", { level: 1, name: "Inquiry detail" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 1, name: subject })).toBeVisible()
    await expect(page.getByText(first.message)).toBeVisible()
    await expect(page.getByRole("link", { name: "Back to inquiries" })).toHaveAttribute("href", "/buyer/inquiries")
  })

  test("lists the buyer's bookings, or says there are none", async ({ page, apiAs }) => {
    const api = await apiAs("buyer")
    const bookings = await getJson<Paged<unknown>>(api, `bookings?page=1&limit=${DASHBOARD_PAGE_SIZE}`)

    await open(page, "/buyer/bookings")

    await expect(page.getByRole("heading", { level: 1, name: "My Bookings" })).toBeVisible()
    for (const column of ["Consultation", "Schedule", "Status", "Requested"]) {
      await expect(page.getByRole("columnheader", { name: column })).toBeVisible()
    }
    await expectTableToMatch(page, bookings.meta.total, "No records found.")
  })

  test("lists marketplace quote requests with their status filters", async ({ page, apiAs }) => {
    const api = await apiAs("buyer")
    const quotes = await getJson<Paged<unknown>>(api, `marketplace/quotes?page=1&limit=${DASHBOARD_PAGE_SIZE}`)

    await open(page, "/buyer/marketplace-quotes")

    await expect(page.getByRole("heading", { level: 1, name: "Marketplace Quotes" })).toBeVisible()
    const status = page.getByRole("group", { name: "Status" })
    for (const chip of ["All", "New", "Assigned", "Contacted", "Negotiating", "Quote sent", "Won", "Lost", "Closed"]) {
      await expect(status.getByRole("button", { name: chip, exact: true })).toBeVisible()
    }
    await expect(status.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true")
    for (const column of ["Request", "Supplier", "Status", "Latest reply", "Actions"]) {
      await expect(page.getByRole("columnheader", { name: column })).toBeVisible()
    }
    await expectTableToMatch(page, quotes.meta.total, "No marketplace quote requests yet.")
  })

  test("narrows marketplace quotes by status", async ({ page, apiAs }) => {
    // The page shows an empty list when the API errors, so ask the API with the same filter first.
    const api = await apiAs("buyer")
    const quotes = await getJson<Paged<unknown>>(
      api,
      `marketplace/quotes?page=1&limit=${DASHBOARD_PAGE_SIZE}&status=NEW`,
    )

    await open(page, "/buyer/marketplace-quotes")
    const status = page.getByRole("group", { name: "Status" })
    await hydrated(status.getByRole("button", { name: "New", exact: true }))
    await status.getByRole("button", { name: "New", exact: true }).click()

    await expect(page).toHaveURL(/\/buyer\/marketplace-quotes\?status=NEW$/)
    await expect(status.getByRole("button", { name: "New", exact: true })).toHaveAttribute("aria-pressed", "true")
    await expect(status.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "false")
    await expectTableToMatch(page, quotes.meta.total, "No marketplace quote requests yet.")
  })

  test("shows recent searches, or says there are none", async ({ page }) => {
    await open(page, "/buyer/recent-searches")

    await expect(page.getByRole("heading", { level: 1, name: "Recent Searches" })).toBeVisible()
    // Searches live in this browser, and a new browser has none.
    await expect(page.getByText("No recent searches", { exact: true })).toBeVisible()
    await expect(linkOrButton(page, "Search Listings")).toHaveAttribute("href", "/properties")
  })

  test("records a property search under recent searches", async ({ page }) => {
    await open(page, "/properties?search=Dhanmondi")
    // The listing page writes the search once it has hydrated; leaving earlier would lose it.
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), LS_RECENT_SEARCHES))
      .toContain("Dhanmondi")

    await open(page, "/buyer/recent-searches")
    await expect(page.getByRole("link", { name: "Dhanmondi", exact: true })).toHaveAttribute(
      "href",
      "/properties?search=Dhanmondi",
    )

    await open(page, buyer.dashboard)
    await expect(tile(page, "Recent Searches", 1)).toBeVisible()
  })

  test("shows the profile with the saved details and a read-only email", async ({ page, apiAs }) => {
    const me = await getData<Me>(await apiAs("buyer"), "users/me")

    await open(page, "/buyer/profile")

    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible()
    await expect(page.getByLabel("Full Name")).toHaveValue(me.name)
    await expect(page.getByLabel("Phone Number")).toHaveValue(me.phone ?? "")
    await expect(page.getByLabel("Email Address")).toHaveValue(me.email)
    await expect(page.getByLabel("Email Address")).not.toBeEditable()
    // View only: the form is never submitted.
    await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled()
  })
})

test.describe("buyer pages on the public site", () => {
  test("shows notifications, or says the buyer is all caught up", async ({ page, apiAs }) => {
    const api = await apiAs("buyer")
    const notifications = await getJson<Paged<{ title: string }> & { unread?: number }>(api, "notifications?limit=50")

    await open(page, "/notifications")

    await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible()
    await expect(page.getByText(new RegExp(`^\\s*${notifications.unread ?? 0} unread\\s*$`))).toBeVisible()
    if (notifications.data.length === 0) {
      await expect(page.getByRole("heading", { name: "You are all caught up" })).toBeVisible()
    } else {
      // Titles repeat across notifications, so look for the newest one's title anywhere in the list.
      await expect(page.getByText(notifications.data[0].title, { exact: true }).first()).toBeVisible()
    }
  })

  test.describe("pre-approval", () => {
    // The buyer has no pre-approval on file, so the API answers 404 for /pre-approval/me.
    test.use({ allowedErrors: [/\/pre-approval\/me.*404/] })

    test("shows the pre-approval form prefilled for the signed-in buyer", async ({ page, apiAs }) => {
      const me = await getData<Me>(await apiAs("buyer"), "users/me")

      await open(page, "/pre-approval")

      await expect(page.getByRole("heading", { level: 1, name: "Mortgage pre-approval" })).toBeVisible()
      for (const step of ["About you", "Your work", "Your income", "Your loan"]) {
        await expect(page.getByRole("heading", { level: 2, name: step })).toBeVisible()
      }
      await expect(page.getByLabel("Full name *")).toHaveValue(me.name)
      await expect(page.getByLabel("Email *")).toHaveValue(me.email)
      // Signed in, so the page doesn't ask for a sign-in. View only: Check Eligibility is never clicked.
      await expect(page.getByText("Sign in to submit and save your pre-approval request.")).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Check Eligibility" })).toBeEnabled()
    })
  })

  test("shows an empty compare list until a listing is added", async ({ page }) => {
    await open(page, "/compare")

    await expect(page.getByRole("heading", { level: 1, name: "Compare Properties" })).toBeVisible()
    await expect(page.getByText("No properties selected for comparison.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Browse listings" })).toHaveAttribute("href", "/properties")
  })
})

test.describe("property page", () => {
  test("shows the listing to a signed-in buyer with its seller card, save and compare", { tag: "@known-bug" }, async ({
    page,
    apiAs,
  }) => {
    test.fail(true, KNOWN_BUG.viewTransitionName)
    const property = await getData<ApiProperty>(await apiAs("buyer"), `properties/${PROPERTY_SLUG}`)

    await openProperty(page, property.slug)

    await expect(page.getByRole("heading", { level: 1, name: property.title })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Contact Seller" })).toBeVisible()
    await expect(heartOnPage(page)).toBeVisible()
    await expect(page.getByRole("button", { name: "Compare property" }).first()).toBeVisible()
  })

  // The tests below start from the property page but check something else, so they allow the console
  // errors of KNOWN_BUG.viewTransitionName (VIEW_TRANSITION_ERRORS). The test above does not.
  test.describe("compare", () => {
    test.use({ allowedErrors: VIEW_TRANSITION_ERRORS })

    test("compares a listing added from its page", async ({ page, apiAs }) => {
      const property = await getData<ApiProperty>(await apiAs("buyer"), `properties/${PROPERTY_SLUG}`)

      await openProperty(page, property.slug)
      const compareButton = page.getByRole("button", { name: "Compare property" }).first()
      await compareButton.click()
      await expect(compareButton).toHaveAttribute("aria-pressed", "true")

      // The list is kept in this browser, so nothing is written to the API.
      await open(page, "/compare")
      await expect(page.getByRole("heading", { level: 1, name: "Compare Properties" })).toBeVisible()
      await expect(page.getByText("1 of 4 selected")).toBeVisible()
      await expect(page.getByRole("link", { name: property.title })).toHaveAttribute(
        "href",
        `/properties/${property.slug}`,
      )
      await expect(page.getByRole("row", { name: /^Price\b/ })).toContainText(/\d/)
    })
  })

  // These two tests save the same property, so they must not run side by side. Playwright runs one
  // file's tests one after another unless the config makes them parallel.
  test.describe("save", () => {
    // The two writes of the whole browser suite, cleaned up below.
    test.use({ allowedWrites: [/^(POST|DELETE) \S+\/properties\/[0-9a-f]{24}\/save$/] })

    // After every test here, passed, failed or timed out: the property must end up unsaved.
    // An afterEach hook still runs after a timeout, where code after an `await` in the test does not.
    test.afterEach(async ({ apiAs }) => {
      const api = await apiAs("buyer")
      const property = await getData<ApiProperty>(api, `properties/${PROPERTY_SLUG}`)
      await api.delete(`properties/${property.id}/save`)
      expect(await isSavedOnServer(api, property.id), "cleanup: the property must end up unsaved").toBe(false)
    })

    test.describe("from the property page", () => {
      test.use({ allowedErrors: VIEW_TRANSITION_ERRORS })

      test("saves a property, finds it under saved properties, then unsaves it", async ({ page, apiAs }) => {
        const api = await apiAs("buyer")
        const property = await getData<ApiProperty>(api, `properties/${PROPERTY_SLUG}`)
        await startUnsaved(api, property)

        // 1. Save it from its page.
        await openProperty(page, property.slug)
        const heart = heartOnPage(page)
        await expect(heart).toHaveAttribute("aria-pressed", "false")
        const [saved] = await Promise.all([saveCall(page, "POST", property.id), heart.click()])
        expectOk(saved, "saving")
        await expect(heart).toHaveAttribute("aria-pressed", "true")

        // 2. The saved-properties page lists it.
        await open(page, "/buyer/saved-properties")
        await expect(page.getByRole("heading", { level: 1, name: "Saved Properties" })).toBeVisible()
        const card = savedCard(page, property.title)
        await expect(card).toBeVisible()

        // 3. Unsave it from its card. The card's heart reads as saved once the page has hydrated.
        const cardHeart = card.getByRole("button", { name: "Save property" })
        await expect(cardHeart).toHaveAttribute("aria-pressed", "true")
        const [unsaved] = await Promise.all([saveCall(page, "DELETE", property.id), cardHeart.click()])
        expectOk(unsaved, "unsaving")
        await expect(cardHeart).toHaveAttribute("aria-pressed", "false")

        // 4. It is gone from the list.
        await page.reload()
        await expect(page.getByRole("heading", { level: 1, name: "Saved Properties" })).toBeVisible()
        await expect(savedCard(page, property.title)).toHaveCount(0)
      })
    })

    test("shows a property saved in another browser as saved on the saved-properties page", { tag: "@known-bug" }, async ({
      page,
      apiAs,
    }) => {
      test.fail(true, KNOWN_BUG.savedHeart)
      // Another browser stands for another device: the buyer saved the property there, so the server
      // has it but this fresh browser's own list does not.
      const api = await apiAs("buyer")
      const property = await getData<ApiProperty>(api, `properties/${PROPERTY_SLUG}`)
      await startUnsaved(api, property)
      expectOk(await api.post(`properties/${property.id}/save`), "saving")

      await open(page, "/buyer/saved-properties")

      const card = savedCard(page, property.title)
      await expect(card).toBeVisible()
      await expect(card.getByRole("button", { name: "Save property" })).toHaveAttribute("aria-pressed", "true")
    })
  })
})

test.describe("role guard", () => {
  for (const area of ["admin", "seller"]) {
    test(`keeps the buyer out of the ${area} area`, async ({ page }) => {
      await open(page, `/${area}/dashboard`)

      await expect(page).toHaveURL(/\/unauthorized$/)
      await expect(page.getByRole("heading", { level: 1, name: "Access Denied" })).toBeVisible()
      await expect(page.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/")
      await expect(page.getByRole("heading", { name: "Something went wrong" })).toHaveCount(0)
    })
  }
})
