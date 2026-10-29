import type { Locator, Page } from "@playwright/test"

import { account } from "./accounts"
import { expect, test, type ApiClient } from "./fixtures"
import { COMPILE, KNOWN_BUG, MISSING_ID, escapeRegExp, getJson, linkOrButton, open, pagerLine } from "./helpers"

/**
 * The seller's listing workspace, signed in as the demo seller (project `seller`).
 *
 * Data safety: these tests only read. They never click Create/Update Property, Save response,
 * Save changes or Sign out.
 *
 * Things to know when reading the locators (all measured at the suite's 1280px desktop size):
 *  - Tables, pagers, section headers and page headers are rendered twice: a phone layout (hidden
 *    at this size, so it is not in the accessibility tree) and the desktop one. Role locators see
 *    only the visible copy; `getByText` sees both, so `pagerLine()` keeps the visible one.
 *  - The app's `<Button render={<Link/>}>` renders an anchor with role="button", so "Edit",
 *    "View" and "Open All" are found with `linkOrButton()`; plain links keep role="link".
 *  - Many seller pages load their data on the Next server and turn an API error into an empty
 *    list or a zero. The browser never sees that call, so each page is checked against the API's
 *    own answer for the same seller (`apiAs("seller")`) instead of only "something rendered".
 *    For the same reason a test skips for lack of data only when the API says there is none;
 *    an empty page over data the API reports is a failure, never a skip.
 */

/** A Mongo ObjectId, as used in the seller's detail and edit URLs. */
const OBJECT_ID = "[0-9a-f]{24}"
/** DASHBOARD_PAGE_SIZE (src/lib/constants.ts): rows per page on the seller's tables. */
const PAGE_SIZE = 10

const NO_RECORDS = "No records found."
const NO_LISTINGS = "No listings yet."
const NO_INQUIRIES = "No inquiries match this filter."
const NO_BOOKINGS = "No bookings match this filter."

/**
 * A whole-text match for `getByText`. A regex is tested against the raw text, which keeps the
 * spaces JSX leaves around inline text (" 4 unread"), so a bare ^...$ would miss it.
 */
const wholeText = (pattern: string, flags = "") => new RegExp(`^\\s*${pattern}\\s*$`, flags)

/** A listing price as the app prints it: "৳1.35 Cr", "৳85.5 L", "৳65,000" or "৳65,000/month". */
const PRICE = wholeText("৳[\\d.,]+( Cr| L|/month)?")
/** The status badges a listing can carry. */
const LISTING_STATUS = wholeText("(Pending|Approved|Verified|Rejected|Featured)")
/** The statuses that have a filter chip on My Properties. */
const LISTING_STATUS_CHIPS = ["Pending", "Approved", "Verified", "Rejected"]
const INQUIRY_STATUS = wholeText("(New|Read|Replied|Closed)")

/** Inquiry type (as the table prints it) to the label of its filter chip. */
const TYPE_CHIP: Record<string, string> = {
  property: "Property",
  project: "Apartment",
  general: "General",
  report: "Report",
  supplier: "Supplier",
  investor: "Investor",
}

type ListBody<T> = { data: T[]; meta: { total: number }; unread?: number }
/** The signed-in seller as GET auth/me describes them. */
type Me = { id: string; name: string; email: string; phone?: string | null }
type PropertyRecord = {
  title: string
  description: string
  price: number
  division: string
  district: string
  area: string
  bedrooms: number
  bathrooms: number
  size: number
  images: unknown[]
}
type InquiryRecord = { name: string; email: string; phone: string; message: string }
type SellerStats = {
  totalListings: number
  activeListings: number
  pendingListings: number
  totalInquiries: number
  newInquiries: number
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** The API's own counts for this seller. Tests decide from these whether there is data to look at. */
const sellerStats = async (api: ApiClient) => (await getJson<{ data: SellerStats }>(api, "dashboard/seller")).data

/** How many listings the API says this seller has (the dashboard's count, which is what the list should add up to). */
const listingTotal = async (api: ApiClient) => (await sellerStats(api)).totalListings

/** The one visible table of a dashboard page. */
const dataTable = (page: Page) => page.getByRole("table")

/** Rows that hold a record (the header row has no cells). The empty state is a row too, so it is filtered out. */
const recordRows = (table: Locator, emptyText: string) =>
  table.getByRole("row").filter({ has: table.page().getByRole("cell") }).filter({ hasNotText: emptyText })

/** What every record shows under one column header; the column is found by its header text. */
async function columnValues(table: Locator, header: RegExp, emptyText: string): Promise<string[]> {
  // Hidden headers too, so the index matches the row's `cells`.
  const headers = await table
    .getByRole("columnheader", { includeHidden: true })
    .evaluateAll((cells) => cells.map((cell) => cell.textContent?.trim() ?? ""))
  const index = headers.findIndex((text) => header.test(text))
  expect(index, `a column matching ${header} among [${headers.join(", ")}]`).toBeGreaterThanOrEqual(0)
  return recordRows(table, emptyText).evaluateAll(
    (rows, at) => rows.map((row) => (row as HTMLTableRowElement).cells[at]?.textContent?.trim() ?? ""),
    index,
  )
}

/** The distinct values of a column, for "every row shows X" checks that can be polled. */
const distinctColumnValues = async (table: Locator, header: RegExp, emptyText: string) => [
  ...new Set(await columnValues(table, header, emptyText)),
]

/**
 * The first record of a list page. `total` is what the API reports: with none the test is skipped,
 * with some the page must show them (a page that cannot reach the API shows its empty state).
 */
async function firstRecord(table: Locator, emptyText: string, total: number, what: string): Promise<Locator> {
  test.skip(total === 0, `The seller has no ${what} to open`)
  const first = recordRows(table, emptyText).first()
  await expect(first, `the first of the ${total} ${what} the API reports`).toBeVisible()
  return first
}

/** `count` rows of a list that the API says holds that many. */
const expectRows = (rows: Locator, count: number, what: string) =>
  expect(rows, `${what} on the page; the API reports ${count}`).toHaveCount(count)

/** A dashboard stat card. Its label and value are separate spans, so the card's whole text is matched. */
const statCard = (page: Page, label: string, value: number | string) =>
  page.getByText(wholeText(`${escapeRegExp(label)}\\s*${escapeRegExp(String(value))}`, "i"))

/**
 * Clicks a filter chip and waits for the URL to carry the choice. The click is retried because a
 * dev-server page can be clicked before React has hydrated it, which drops the click.
 */
async function chooseFilter(page: Page, group: string, label: string, param: string, value: string): Promise<Locator> {
  const chip = page.getByRole("group", { name: group, exact: true }).getByRole("button", { name: label, exact: true })
  await expect(async () => {
    await chip.click()
    await expect(page).toHaveURL(new RegExp(`[?&]${param}=${value}(&|$)`), { timeout: 8_000 })
  }).toPass({ timeout: 30_000 })
  return chip
}

// ─── dashboard ───────────────────────────────────────────────────────────────

test.describe("seller dashboard", () => {
  test("shows the seller's listing and inquiry counts", async ({ page, apiAs }) => {
    const stats = await sellerStats(await apiAs("seller"))

    await open(page, "/seller/dashboard")

    await expect(page.getByRole("heading", { level: 1, name: "Seller Dashboard" })).toBeVisible()
    await expect(statCard(page, "My Listings", stats.totalListings)).toBeVisible()
    await expect(statCard(page, "Active Listings", stats.activeListings)).toBeVisible()
    await expect(statCard(page, "Pending", stats.pendingListings)).toBeVisible()
    await expect(statCard(page, "New Inquiries", `${stats.newInquiries}/${stats.totalInquiries}`)).toBeVisible()
    await expect(page.getByText(wholeText("Views\\s*\\d+", "i"))).toBeVisible()
  })

  test("shows total views at least as high as the views on its recent listings", { tag: "@known-bug" }, async ({
    page,
    apiAs,
  }) => {
    test.fail(true, KNOWN_BUG.sellerViews)
    const { totalListings } = await sellerStats(await apiAs("seller"))
    test.skip(totalListings === 0, "The seller has no listings to compare with")

    await open(page, "/seller/dashboard")

    const listingViews = page.getByText(wholeText("\\d+ views?"))
    await expect(listingViews.first(), `a recent listing on the page; the API reports ${totalListings} listings`).toBeVisible()
    const mostViewed = Math.max(...(await listingViews.allTextContents()).map((text) => Number.parseInt(text, 10)))
    test.skip(mostViewed === 0, "No recent listing has a view yet, so a Views card of 0 is right")

    const totalViews = Number.parseInt(((await page.getByText(wholeText("Views\\s*\\d+", "i")).textContent()) ?? "").replace(/\D/g, ""), 10)
    expect(totalViews, `Views card vs the ${mostViewed} views on one recent listing`).toBeGreaterThanOrEqual(mostViewed)
  })

  test("lists the most recent inquiries with sender, subject and status", async ({ page, apiAs }) => {
    const inquiries = await getJson<ListBody<unknown>>(await apiAs("seller"), "inquiries?limit=1")

    await open(page, "/seller/dashboard")

    await expect(page.getByRole("heading", { level: 2, name: "Recent Inquiries" })).toBeVisible()
    const table = dataTable(page)
    await expect(table.getByRole("columnheader")).toHaveText([/^from$/i, /^subject$/i, /^status$/i, /^date$/i])

    const rows = recordRows(table, NO_RECORDS)
    await expectRows(rows, Math.min(5, inquiries.meta.total), "recent inquiries")
    if (inquiries.meta.total === 0) {
      await expect(table).toContainText(NO_RECORDS)
    } else {
      await expect(rows.first()).toContainText("@")
      await expect(rows.first().getByText(INQUIRY_STATUS)).toBeVisible()
    }
  })

  test("lists the most recent listings, each with views, price and an Edit Listing link", async ({ page, apiAs }) => {
    const stats = await sellerStats(await apiAs("seller"))

    await open(page, "/seller/dashboard")

    await expect(page.getByRole("heading", { level: 2, name: "Recent Listings" })).toBeVisible()
    const shown = Math.min(4, stats.totalListings)
    const editLinks = page.getByRole("link", { name: "Edit Listing", exact: true })
    await expectRows(editLinks, shown, "recent listings")
    if (shown === 0) {
      await expect(page.getByText("No listings yet.")).toBeVisible()
      return
    }
    await expect(page.getByText(wholeText("\\d+ views?"))).toHaveCount(shown)
    await expect(page.getByText(PRICE)).toHaveCount(shown)
    for (const link of await editLinks.all()) {
      await expect(link).toHaveAttribute("href", new RegExp(`^/seller/properties/${OBJECT_ID}/edit$`))
    }
  })

  test("links to adding a property, the inquiry queue and listing management", async ({ page }) => {
    await open(page, "/seller/dashboard")

    const main = page.getByRole("main")
    await expect(main.getByRole("link", { name: "Add Property", exact: true })).toHaveAttribute("href", "/seller/properties/create")
    await expect(linkOrButton(main, "Open All")).toHaveAttribute("href", "/seller/inquiries")
    await expect(linkOrButton(main, "Manage")).toHaveAttribute("href", "/seller/properties")
  })

  test("sidebar links to every seller page and marks the current one", async ({ page }) => {
    await open(page, "/seller/dashboard")

    const sidebar = page.getByRole("complementary", { name: "Seller Workspace navigation" })
    const pages: [string, string][] = [
      ["Dashboard", "/seller/dashboard"],
      ["My Properties", "/seller/properties"],
      ["Add Property", "/seller/properties/create"],
      ["My Catalogue", "/seller/marketplace-catalogue"],
      ["Inquiries", "/seller/inquiries"],
      ["Bookings", "/seller/bookings"],
      ["Profile", "/seller/profile"],
    ]
    for (const [name, href] of pages) {
      await expect(sidebar.getByRole("link", { name, exact: true })).toHaveAttribute("href", href)
    }
    await expect(sidebar.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(sidebar.getByRole("button", { name: "Sign out" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Account menu" })).toContainText(/seller/i)
  })
})

// ─── my properties ───────────────────────────────────────────────────────────

test.describe("my properties", () => {
  test("lists the seller's listings with price, status and an Edit action", async ({ page, apiAs }) => {
    const total = await listingTotal(await apiAs("seller"))

    await open(page, "/seller/properties")

    await expect(page.getByRole("heading", { level: 1, name: "My Properties" })).toBeVisible()
    const table = dataTable(page)
    for (const header of [/^listing$/i, /^price$/i, /^status$/i, /^actions$/i]) {
      await expect(table.getByRole("columnheader", { name: header })).toBeVisible()
    }

    const onPage = Math.min(PAGE_SIZE, total)
    const rows = recordRows(table, NO_LISTINGS)
    await expectRows(rows, onPage, "listings")
    if (total === 0) {
      await expect(table).toContainText(NO_LISTINGS)
      return
    }
    await expect(rows.filter({ has: page.getByText(PRICE) })).toHaveCount(onPage)
    await expect(rows.filter({ has: page.getByText(LISTING_STATUS) })).toHaveCount(onPage)
    await expect(pagerLine(page)).toHaveText(`Showing 1-${onPage} of ${total}`)

    const first = rows.first()
    await expect(first.getByRole("link").first()).toHaveAttribute("href", /^\/properties\/.+/)
    await expect(linkOrButton(first, "Edit")).toHaveAttribute("href", new RegExp(`^/seller/properties/${OBJECT_ID}/edit$`))
    await expect(page.getByRole("main").getByRole("link", { name: "Add Property", exact: true })).toHaveAttribute(
      "href",
      "/seller/properties/create",
    )
  })

  test("pages through the listings", async ({ page, apiAs }) => {
    const total = await listingTotal(await apiAs("seller"))
    test.skip(total <= PAGE_SIZE, "The seller has only one page of listings")

    await open(page, "/seller/properties")
    const table = dataTable(page)
    const titles = recordRows(table, NO_LISTINGS).getByRole("link").first()
    await expect(titles).toBeVisible()
    const firstOnPageOne = (await titles.innerText()).trim()

    const pager = page.getByRole("navigation", { name: "Pagination" })
    // Page "2" rather than "Next page": clicking it again after a slow load changes nothing.
    await expect(async () => {
      await pager.getByRole("button", { name: "2", exact: true }).click()
      await expect(page).toHaveURL(/[?&]page=2(&|$)/, { timeout: 8_000 })
    }).toPass({ timeout: 30_000 })
    await expect(pagerLine(page)).toHaveText(`Showing ${PAGE_SIZE + 1}-${Math.min(2 * PAGE_SIZE, total)} of ${total}`)
    await expect(pager.getByRole("button", { name: "2", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(titles).not.toHaveText(firstOnPageOne)

    await pager.getByRole("button", { name: "Previous page" }).click()
    await expect(pagerLine(page)).toHaveText(`Showing 1-${PAGE_SIZE} of ${total}`)
    await expect(titles).toHaveText(firstOnPageOne)
  })

  test("narrows the list to the status of the first listing", async ({ page, apiAs }) => {
    const total = await listingTotal(await apiAs("seller"))

    await open(page, "/seller/properties")
    const table = dataTable(page)
    await firstRecord(table, NO_LISTINGS, total, "listings")
    const status = (await columnValues(table, /^status$/i, NO_LISTINGS)).find((value) => LISTING_STATUS_CHIPS.includes(value))
    test.skip(!status, "No listing on the first page has a status that has a filter chip")
    if (!status) return

    const chip = await chooseFilter(page, "Status", status, "status", status.toLowerCase())

    await expect(chip).toHaveAttribute("aria-pressed", "true")
    await expect.poll(() => distinctColumnValues(table, /^status$/i, NO_LISTINGS), { message: `statuses listed under the ${status} chip` }).toEqual([status])
  })

  test("the Pending chip lists as many listings as the dashboard counts as pending", async ({ page, apiAs }) => {
    const stats = await sellerStats(await apiAs("seller"))
    test.skip(stats.pendingListings === 0, "The seller has no pending listings")

    await open(page, "/seller/properties")
    await chooseFilter(page, "Status", "Pending", "status", "pending")

    const shown = Math.min(PAGE_SIZE, stats.pendingListings)
    await expect(pagerLine(page)).toHaveText(`Showing 1-${shown} of ${stats.pendingListings}`)
  })
})

// ─── edit and add property forms (render only, never submitted) ──────────────

test.describe("property forms", () => {
  test("opens the first listing's edit form filled in with its details", async ({ page, apiAs }) => {
    const total = await listingTotal(await apiAs("seller"))

    await open(page, "/seller/properties")
    const first = await firstRecord(dataTable(page), NO_LISTINGS, total, "listings")
    const title = (await first.getByRole("link").first().innerText()).trim()

    await linkOrButton(first, "Edit").click()

    await expect(page).toHaveURL(new RegExp(`/seller/properties/${OBJECT_ID}/edit$`), COMPILE)
    await expect(page.getByRole("heading", { level: 1, name: "Edit Property" })).toBeVisible(COMPILE)
    await expect(page.getByRole("heading", { level: 2, name: "Update property details" })).toBeVisible()
    await expect(page.getByLabel("Listing Title")).toHaveValue(title)

    // Every field shows what the API holds for this listing.
    const id = new RegExp(`/seller/properties/(${OBJECT_ID})/edit$`).exec(page.url())?.[1]
    const { data: listing } = await getJson<{ data: PropertyRecord }>(await apiAs("seller"), `properties/id/${id}`)
    expect(listing.title).toBe(title)
    await expect(page.getByLabel("Description", { exact: true })).toHaveValue(listing.description)
    await expect(page.getByLabel("Price (BDT)")).toHaveValue(String(listing.price))
    await expect(page.getByLabel("Division", { exact: true })).toHaveValue(listing.division)
    await expect(page.getByLabel("District", { exact: true })).toHaveValue(listing.district)
    await expect(page.getByLabel("Area", { exact: true })).toHaveValue(listing.area)
    await expect(page.getByLabel("Size", { exact: true })).toHaveValue(String(listing.size))
    await expect(page.getByLabel("Bedrooms", { exact: true })).toHaveValue(String(listing.bedrooms))
    await expect(page.getByLabel("Bathrooms", { exact: true })).toHaveValue(String(listing.bathrooms))

    await expect(page.getByText(new RegExp(`^\\s*${listing.images.length}/12 added`))).toBeVisible()
    await expect(page.getByRole("button", { name: "Update Property", exact: true })).toBeEnabled()
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeVisible()
    await expect(linkOrButton(page.getByRole("main"), "Back to Listings")).toHaveAttribute("href", "/seller/properties")
  })

  test("renders the add-property form empty, with the seller's contact details filled in", async ({ page, apiAs }) => {
    const { data: me } = await getJson<{ data: Me }>(await apiAs("seller"), "auth/me")

    await open(page, "/seller/properties/create")

    await expect(page.getByRole("heading", { level: 1, name: "Add Property" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Create property listing" })).toBeVisible()
    await expect(linkOrButton(page.getByRole("main"), "Back to Listings")).toHaveAttribute("href", "/seller/properties")

    for (const label of [
      "Listing Title",
      "Description",
      "Property Type",
      "Price (BDT)",
      "Division",
      "District",
      "Area",
      "Full Address",
      "Map Pin / Maps URL",
      "Size",
      "Size Unit",
      "Bedrooms",
      "Bathrooms",
      "Balconies",
      "Floor Number",
      "Total Floors",
      "External video link (optional)",
      "Contact Name",
      "Contact Phone",
      "WhatsApp",
    ]) {
      await expect(page.getByLabel(label, { exact: true }), label).toBeVisible()
    }
    await expect(page.getByRole("button", { name: "For Sale" })).toBeVisible()
    await expect(page.getByRole("button", { name: "For Rent" })).toBeVisible()
    await expect(page.getByRole("checkbox", { name: "Price can be negotiated" })).not.toBeChecked()
    expect(await page.getByRole("checkbox").count(), "facility checkboxes").toBeGreaterThan(10)

    await expect(page.getByLabel("Listing Title")).toHaveValue("")
    await expect(page.getByLabel("Contact Name", { exact: true })).toHaveValue(me.name)
    await expect(page.getByLabel("Contact Phone", { exact: true })).toHaveValue((me.phone ?? "").replace(/-/g, ""))

    await expect(page.getByText(/^\s*0\/12 added/)).toBeVisible()
    await expect(page.getByRole("button", { name: /Click or drag photos to upload/ })).toBeVisible()
    await expect(page.getByRole("button", { name: "Create Property", exact: true })).toBeEnabled()
  })

  test("lists a division's districts once the division is chosen", async ({ page }) => {
    await open(page, "/seller/properties/create")
    const division = page.getByLabel("Division", { exact: true })
    const districts = page.getByLabel("District", { exact: true }).getByRole("option")
    await expect(districts).toHaveCount(1)

    await expect(async () => {
      await division.selectOption("Dhaka")
      await expect(districts).not.toHaveCount(1, { timeout: 3_000 })
    }).toPass({ timeout: 25_000 })

    await expect(districts.filter({ hasText: /^Dhaka$/ })).toHaveCount(1)
  })

  test.describe("a listing that does not exist", () => {
    test.use({ allowedErrors: [new RegExp(`/seller/properties/${MISSING_ID}/edit -> 404`)] })

    test("shows the not-found page instead of an edit form", async ({ page }) => {
      await open(page, `/seller/properties/${MISSING_ID}/edit`)

      await expect(page.getByText("This page could not be found.")).toBeVisible()
      await expect(page.getByLabel("Listing Title")).toHaveCount(0)
    })
  })
})

// ─── inquiries ───────────────────────────────────────────────────────────────

test.describe("seller inquiries", () => {
  test("lists the seller's inquiries with sender, type, status and a View action", async ({ page, apiAs }) => {
    const total = (await getJson<ListBody<unknown>>(await apiAs("seller"), "inquiries?limit=1")).meta.total

    await open(page, "/seller/inquiries")

    await expect(page.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
    const status = page.getByRole("group", { name: "Status", exact: true })
    await expect(status.getByRole("button")).toHaveText(["All", "New", "Read", "Replied", "Closed"])
    await expect(status.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true")
    const type = page.getByRole("group", { name: "Type", exact: true })
    await expect(type.getByRole("button")).toHaveText(["All types", "Property", "Apartment", "General", "Report", "Supplier", "Investor"])

    const table = dataTable(page)
    const onPage = Math.min(PAGE_SIZE, total)
    const rows = recordRows(table, NO_INQUIRIES)
    await expectRows(rows, onPage, "inquiries")
    if (total === 0) {
      await expect(table).toContainText(NO_INQUIRIES)
      return
    }
    await expect(rows.filter({ has: page.getByText(INQUIRY_STATUS) })).toHaveCount(onPage)
    await expect(rows.filter({ hasText: "@" })).toHaveCount(onPage)
    await expect(pagerLine(page)).toHaveText(`Showing 1-${onPage} of ${total}`)
    for (const view of await linkOrButton(table, "View").all()) {
      await expect(view).toHaveAttribute("href", new RegExp(`^/seller/inquiries/${OBJECT_ID}$`))
    }
  })

  test("opens the first inquiry with its sender, subject and status control", async ({ page, apiAs }) => {
    const { totalInquiries } = await sellerStats(await apiAs("seller"))

    await open(page, "/seller/inquiries")
    const table = dataTable(page)
    const first = await firstRecord(table, NO_INQUIRIES, totalInquiries, "inquiries")
    const [name, email] = (await first.getByRole("cell").first().getByRole("paragraph").allInnerTexts()).map((text) =>
      text.trim(),
    )
    const [related] = await columnValues(table, /^related to$/i, NO_INQUIRIES)
    const [status] = await columnValues(table, /^status$/i, NO_INQUIRIES)

    await linkOrButton(first, "View").click()

    await expect(page).toHaveURL(new RegExp(`/seller/inquiries/${OBJECT_ID}$`), COMPILE)
    await expect(page.getByRole("heading", { level: 1, name: "Inquiry detail" })).toBeVisible(COMPILE)
    await expect(page.getByRole("link", { name: "Back to inquiries" })).toHaveAttribute("href", "/seller/inquiries")
    const main = page.getByRole("main")
    await expect(main.getByText(name, { exact: true })).toBeVisible()
    await expect(main.getByText(email, { exact: true })).toBeVisible()
    const id = new RegExp(`/seller/inquiries/(${OBJECT_ID})$`).exec(page.url())?.[1]
    const { data: inquiry } = await getJson<{ data: InquiryRecord }>(await apiAs("seller"), `inquiries/${id}`)
    expect(inquiry.email).toBe(email)
    await expect(main.getByRole("link", { name: /^Phone/ })).toHaveAttribute("href", `tel:${inquiry.phone}`)
    await expect(main).toContainText(inquiry.message.trim().slice(0, 60))
    // The list says "General" where the detail says "General inquiry", so compare real titles only.
    if (!/^(General|Supplier application|Investor application)$/.test(related)) {
      await expect(main.getByRole("heading", { level: 1, name: related, exact: true })).toBeVisible()
      await expect(linkOrButton(main, "Open related page")).toHaveAttribute("href", /^\/(properties|apartments)\/.+/)
    }
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(status.toLowerCase())
    await expect(page.getByLabel("Reply note")).toBeVisible()
    await expect(page.getByRole("button", { name: "Save response", exact: true })).toBeEnabled()
  })

  test("narrows the list to the status of the first inquiry", async ({ page, apiAs }) => {
    const { totalInquiries } = await sellerStats(await apiAs("seller"))

    await open(page, "/seller/inquiries")
    const table = dataTable(page)
    await firstRecord(table, NO_INQUIRIES, totalInquiries, "inquiries")
    const [status] = await columnValues(table, /^status$/i, NO_INQUIRIES)

    const chip = await chooseFilter(page, "Status", status, "status", status.toLowerCase())

    await expect(chip).toHaveAttribute("aria-pressed", "true")
    await expect.poll(() => distinctColumnValues(table, /^status$/i, NO_INQUIRIES), { message: `statuses listed under the ${status} chip` }).toEqual([status])
  })

  test("the New chip lists as many inquiries as the dashboard counts as new", async ({ page, apiAs }) => {
    const stats = await sellerStats(await apiAs("seller"))
    test.skip(stats.newInquiries === 0, "The seller has no new inquiries")

    await open(page, "/seller/inquiries")
    await chooseFilter(page, "Status", "New", "status", "new")

    const shown = Math.min(PAGE_SIZE, stats.newInquiries)
    await expect(pagerLine(page)).toHaveText(`Showing 1-${shown} of ${stats.newInquiries}`)
  })

  test("narrows the list to the type of the first inquiry", { tag: "@known-bug" }, async ({ page, apiAs }) => {
    test.fail(true, KNOWN_BUG.sellerInquiryType)
    const { totalInquiries } = await sellerStats(await apiAs("seller"))

    await open(page, "/seller/inquiries")
    const table = dataTable(page)
    await firstRecord(table, NO_INQUIRIES, totalInquiries, "inquiries")
    const types = await distinctColumnValues(table, /^type$/i, NO_INQUIRIES)
    test.skip(types.length < 2, "Every inquiry on the page has the same type, so a Type chip cannot narrow the list")
    const [type] = (await columnValues(table, /^type$/i, NO_INQUIRIES)).map((text) => text.toLowerCase())
    const label = TYPE_CHIP[type]
    expect(label, `a Type chip for "${type}"`).toBeDefined()

    const chip = await chooseFilter(page, "Type", label, "type", type)

    await expect
      .poll(async () => (await distinctColumnValues(table, /^type$/i, NO_INQUIRIES)).map((text) => text.toLowerCase()), {
        message: `types still listed after choosing the ${label} chip`,
      })
      .toEqual([type])
    await expect(chip).toHaveAttribute("aria-pressed", "true")
  })

  test.describe("an inquiry that does not exist", () => {
    test.use({ allowedErrors: [new RegExp(`/seller/inquiries/${MISSING_ID} -> 404`)] })

    test("shows the not-found page instead of a detail view", async ({ page }) => {
      await open(page, `/seller/inquiries/${MISSING_ID}`)

      await expect(page.getByText("This page could not be found.")).toBeVisible()
      await expect(page.getByLabel("Reply note")).toHaveCount(0)
    })
  })
})

// ─── bookings, profile, notifications ────────────────────────────────────────

test("seller bookings list the seller's consultations, or say there are none", async ({ page, apiAs }) => {
  const total = (await getJson<ListBody<unknown>>(await apiAs("seller"), "bookings?limit=1")).meta.total

  await open(page, "/seller/bookings")

  await expect(page.getByRole("heading", { level: 1, name: "Bookings" })).toBeVisible()
  const status = page.getByRole("group", { name: "Status", exact: true })
  await expect(status.getByRole("button")).toHaveText(["All", "Pending", "Confirmed", "Cancelled", "Completed"])
  await expect(status.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true")
  const table = dataTable(page)
  for (const header of [/^client$/i, /^appointment$/i, /^status$/i, /^actions$/i]) {
    await expect(table.getByRole("columnheader", { name: header })).toBeVisible()
  }

  const rows = recordRows(table, NO_BOOKINGS)
  await expectRows(rows, Math.min(PAGE_SIZE, total), "bookings")
  if (total === 0) {
    await expect(table).toContainText(NO_BOOKINGS)
    return
  }
  // A seller must be able to open what they are shown: no link may point into the admin area.
  for (const view of await linkOrButton(table, "View").all()) {
    await expect(view).not.toHaveAttribute("href", /^\/admin\//)
  }
})

test("seller profile shows the seller's own details, with the email read-only", async ({ page, apiAs }) => {
  const { data: me } = await getJson<{ data: Me }>(await apiAs("seller"), "auth/me")

  await open(page, "/seller/profile")

  await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible()
  await expect(page.getByLabel("Full Name")).toHaveValue(me.name)
  const email = page.getByLabel("Email Address")
  await expect(email).toHaveValue(new RegExp(`^${escapeRegExp(account("seller").email)}$`, "i"))
  await expect(email).toHaveValue(me.email)
  await expect(email).not.toBeEditable()
  await expect(page.getByText("Email changes are handled by support")).toBeVisible()
  await expect(page.getByLabel("Phone Number")).toHaveValue(me.phone ?? "")
  await expect(page.getByLabel("WhatsApp Number")).toBeEditable()
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible()
})

test("notifications page lists the seller's notifications and their unread count", async ({ page, apiAs }) => {
  const { data: latest, meta, unread = 0 } = await getJson<ListBody<{ title: string; isRead: boolean }>>(
    await apiAs("seller"),
    "notifications?limit=50",
  )

  await open(page, "/notifications")

  await expect(page.getByRole("heading", { level: 1, name: "Notifications" })).toBeVisible()
  await expect(page.getByText(wholeText(`${unread} unread`))).toBeVisible()
  if (meta.total === 0) {
    await expect(page.getByRole("heading", { level: 2, name: "You are all caught up" })).toBeVisible()
    return
  }
  await expect(page.getByText(latest[0].title).first()).toBeVisible()
  await expect(page.getByText("(unread)")).toHaveCount(latest.filter((item) => !item.isRead).length)
})

test("notification bell in the header shows the unread count and lists the latest notifications", async ({ page, apiAs }) => {
  const { data: latest, unread = 0 } = await getJson<ListBody<{ title: string }>>(await apiAs("seller"), "notifications?limit=10")

  await open(page, "/seller/dashboard")

  // The badge is fetched in the browser, so the label is also the proof that call worked.
  const bell = page.getByRole("button", { name: unread > 0 ? `Notifications, ${unread} unread` : "Notifications", exact: true })
  await expect(bell).toBeVisible()
  const popup = page.getByRole("dialog")
  // Only open it when closed: a second click on a bell that is already open would close it.
  await expect(async () => {
    if (!(await popup.isVisible())) await bell.click()
    await expect(popup).toBeVisible({ timeout: 5_000 })
  }).toPass({ timeout: 30_000 })

  await expect(popup.getByRole("listitem")).toHaveCount(latest.length)
  if (latest.length === 0) {
    await expect(popup.getByText("You're all caught up.")).toBeVisible()
  } else {
    await expect(popup.getByRole("listitem").first()).toContainText(latest[0].title)
  }
  if (unread > 0) await expect(popup.getByRole("button", { name: "Mark all read" })).toBeVisible()
  await expect(popup.getByRole("link", { name: "View all notifications" })).toHaveAttribute("href", "/notifications")
})

// ─── role guards ─────────────────────────────────────────────────────────────

test.describe("areas that belong to other roles", () => {
  for (const area of ["/buyer/dashboard", "/admin/dashboard"]) {
    test(`${area} refuses the seller with Access Denied`, async ({ page }) => {
      await open(page, area)

      await expect(page).toHaveURL(/\/unauthorized$/, COMPILE)
      await expect(page.getByRole("heading", { level: 1, name: "Access Denied" })).toBeVisible()
      await expect(page.getByText("You do not have permission to view this page.")).toBeVisible()
      await expect(page.getByRole("complementary")).toHaveCount(0)
    })
  }
})
