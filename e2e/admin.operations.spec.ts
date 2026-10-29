import type { Locator, Page } from "@playwright/test"
import { DASHBOARD_PAGE_SIZE } from "../src/lib/constants"
import { expect, test } from "./fixtures"
import {
  COMPILE,
  KNOWN_BUG,
  MISSING_ID,
  escapeRegExp,
  getJson,
  hydrated,
  linkOrButton,
  openSignedIn,
  pagerLine,
} from "./helpers"

// Admin operations: inquiries, bookings, the supplier and investor request lists, notifications.
// Runs as the admin with the login the setup project saved; nothing here logs in.
//
// VIEW ONLY. This is the owner's real data, so no test changes an inquiry or a booking, replies,
// assigns, deletes, or marks a notification read. The controls that would do it (an inquiry's
// "Save response", a booking's Confirm / Mark completed / Cancel, the bell's "Mark all read") are
// checked to be on screen or enabled, and never clicked.
//
// These lists are fetched on the Next server, where an API error turns into an empty list that the
// error collector can't see. So each test asks the API (as the admin) what it holds and checks the
// page shows exactly that: the same records, in the same order, with the same totals.

// A wide desktop window, so the table columns that only appear from the xl breakpoint are on screen.
test.use({ viewport: { width: 1440, height: 900 } })

const NO_INQUIRIES = "No inquiries match this filter."
const NO_BOOKINGS = "No bookings match this filter."

const INQUIRY_STATUS_CHIPS = ["New", "Read", "Replied", "Closed"]
/** Every chip of the Status group, the "no filter" one first. */
const INQUIRY_STATUS_FILTERS = ["All", ...INQUIRY_STATUS_CHIPS]
const BOOKING_STATUS_CHIPS = ["Pending", "Confirmed", "Cancelled", "Completed"]
/** The Type chips: what the user clicks, and the value the URL and the API use for it. */
const INQUIRY_TYPE_CHIPS = [
  { chip: "Property", value: "property" },
  { chip: "Apartment", value: "project" },
  { chip: "General", value: "general" },
  { chip: "Report", value: "report" },
  { chip: "Supplier", value: "supplier" },
  { chip: "Investor", value: "investor" },
]
const PARTNER_REQUESTS = [
  {
    path: "/admin/supplier-requests",
    heading: "Supplier Requests",
    type: "supplier",
    application: "Supplier application",
  },
  {
    path: "/admin/investor-requests",
    heading: "Investor Requests",
    type: "investor",
    application: "Investor application",
  },
]

// ─── What the API returns ─────────────────────────────────────────────────────

type Meta = { page: number; limit: number; total: number; totalPages: number }
type List<T> = { data: T[]; meta: Meta }

type ApiInquiry = {
  id: string
  type: string
  status: string
  name: string
  email: string
  phone: string
  message: string
  reply: string | null
  createdAt: string
  property: { slug: string; title: string } | null
  project: { slug: string; name: string } | null
}

type ApiBooking = {
  id: string
  consultationType: string
  status: string
  name: string
  email: string
  phone: string
  preferredDate: string
  preferredTime: string
  message: string | null
  createdAt: string
  confirmedAt: string | null
  cancelledAt: string | null
  completedAt: string | null
  property: { title: string } | null
  project: { name: string } | null
}

type ApiNotification = { id: string; title: string; message: string; isRead: boolean; link?: string | null }
type Inbox = List<ApiNotification> & { unread: number }

// ─── How the pages print things ───────────────────────────────────────────────

/** "READ" is shown as "Read". */
const statusLabel = (status: string) => status.charAt(0) + status.slice(1).toLowerCase()

/** "25 Oct 2026": the dashboards' date format, read off an ISO timestamp. */
function shortDate(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).formatToParts(
    new Date(iso),
  )
  const part = (type: string) => parts.find((p) => p.type === type)?.value
  return `${part("day")} ${part("month")} ${part("year")}`
}

/** "Received 25 Oct 2026, 3:05 PM": a label, then a date and time. */
const stamp = (label: string, iso: string) => new RegExp(`^${label} ${shortDate(iso)}, \\d{1,2}:\\d{2} [AP]M$`)

/** A pattern that matches `text` literally. */
const literal = (text: string) => new RegExp(escapeRegExp(text))

/** What the "Related to" column says for an inquiry. */
const inquiryRelatedTo = (i: ApiInquiry) =>
  i.type === "SUPPLIER"
    ? "Supplier application"
    : i.type === "INVESTOR"
      ? "Investor application"
      : (i.property?.title ?? i.project?.name ?? "General")

/** What the "Related to" column says for a booking. */
const bookingRelatedTo = (b: ApiBooking) => b.project?.name ?? b.property?.title ?? "-"

/** "SITE_VISIT" is shown as "site visit". */
const consultationLabel = (b: ApiBooking) => b.consultationType.toLowerCase().replace(/_/g, " ")

// ─── Locators ─────────────────────────────────────────────────────────────────

const h1 = (page: Page, name: string) => page.getByRole("heading", { level: 1, name, exact: true })

const filterGroup = (page: Page, name: string) => page.getByRole("group", { name, exact: true })

/**
 * A row's "View" action (an anchor that Base UI marks role="button"). The list is in the page twice (a
 * table, and cards for phones); CSS hides one, so role queries only ever see the one on screen.
 */
const viewAction = (scope: Page | Locator) => linkOrButton(scope, "View")

/** The records of the table: the rows with a View action (not the header, not the empty-state row). */
const tableRows = (page: Page) => page.getByRole("row").filter({ has: viewAction(page) })

// ─── Steps ────────────────────────────────────────────────────────────────────

/** Clicks a filter chip and waits for the page to answer: the chip turns pressed and the URL carries the filter. */
async function chooseFilter(page: Page, group: string, option: string, url: RegExp) {
  const chip = filterGroup(page, group).getByRole("button", { name: option, exact: true })
  await hydrated(chip)
  await chip.click()
  await expect(chip).toHaveAttribute("aria-pressed", "true")
  await expect(page).toHaveURL(url)
}

/** What a list shows for an API total: the empty-state line, or a full page of rows and the "Showing" line. */
async function expectListOf(page: Page, total: number, emptyMessage: string) {
  if (total === 0) {
    await expect(page.getByRole("cell", { name: emptyMessage })).toBeVisible()
    await expect(tableRows(page)).toHaveCount(0)
    return
  }
  const shown = Math.min(total, DASHBOARD_PAGE_SIZE)
  await expect(
    page.getByRole("cell", { name: emptyMessage }),
    `the page says "${emptyMessage}" although the API holds ${total}`,
  ).toHaveCount(0)
  await expect(tableRows(page)).toHaveCount(shown)
  await expect(pagerLine(page)).toHaveText(`Showing 1-${shown} of ${total}`)
}

/** The rows on screen are these inquiries, in this order. */
async function expectInquiryRows(page: Page, inquiries: ApiInquiry[]) {
  await expect(tableRows(page)).toHaveCount(inquiries.length)
  for (const [index, inquiry] of inquiries.entries()) {
    const row = tableRows(page).nth(index)
    await expect(row).toContainText(inquiry.name)
    await expect(row).toContainText(inquiry.email)
    await expect(row).toContainText(inquiryRelatedTo(inquiry))
    await expect(row).toContainText(shortDate(inquiry.createdAt))
    await expect(row.getByText(inquiry.type.toLowerCase(), { exact: true })).toBeVisible()
    await expect(row.getByText(statusLabel(inquiry.status), { exact: true })).toBeVisible()
    await expect(viewAction(row)).toHaveAttribute("href", `/admin/inquiries/${inquiry.id}`)
  }
}

/** The rows on screen are these bookings, in this order. */
async function expectBookingRows(page: Page, bookings: ApiBooking[]) {
  await expect(tableRows(page)).toHaveCount(bookings.length)
  for (const [index, booking] of bookings.entries()) {
    const row = tableRows(page).nth(index)
    await expect(row).toContainText(booking.name)
    await expect(row).toContainText(booking.email)
    await expect(row).toContainText(consultationLabel(booking))
    await expect(row).toContainText(bookingRelatedTo(booking))
    await expect(row).toContainText(shortDate(booking.preferredDate))
    await expect(row).toContainText(booking.preferredTime)
    await expect(row.getByText(statusLabel(booking.status), { exact: true })).toBeVisible()
    await expect(viewAction(row)).toHaveAttribute("href", `/admin/bookings/${booking.id}`)
  }
}

/**
 * An inquiry's page, as the admin sees it: who wrote, what they asked, and the controls to answer.
 * The controls are only looked at: the status select shows the current status, the reply box shows
 * the current reply, and "Save response" is on screen. Nothing is typed, selected or clicked.
 */
async function expectInquiryDetail(page: Page, inquiry: ApiInquiry) {
  const subject = inquiry.property?.title ?? inquiry.project?.name ?? "General inquiry"
  const main = page.getByRole("main")
  const title = h1(page, subject)
  // The hero: kind, status and arrival time sit in the same block as the title.
  const hero = main.locator("div").filter({ has: title }).last()

  await expect(h1(page, "Inquiry detail")).toBeVisible(COMPILE)
  await expect(main.getByRole("link", { name: "Back to inquiries" })).toHaveAttribute("href", "/admin/inquiries")
  await expect(title).toBeVisible()
  await expect(hero.getByText(`${inquiry.type.toLowerCase()} inquiry`, { exact: true })).toBeVisible()
  await expect(hero.getByText(statusLabel(inquiry.status), { exact: true })).toBeVisible()
  await expect(hero.getByText(stamp("Received", inquiry.createdAt))).toBeVisible()

  await expect(main.getByText(inquiry.name, { exact: true }).first()).toBeVisible()
  await expect(main.getByRole("link", { name: literal(inquiry.email) })).toHaveAttribute(
    "href",
    `mailto:${inquiry.email}`,
  )
  await expect(main.getByRole("link", { name: literal(inquiry.phone) })).toHaveAttribute("href", `tel:${inquiry.phone}`)
  await expect(main.getByText(inquiry.message.trim().split("\n")[0].trim()).first()).toBeVisible()

  if (inquiry.reply) await expect(main.getByText("Latest reply", { exact: true })).toBeVisible()
  else await expect(main.getByText("Latest reply", { exact: true })).toHaveCount(0)

  await expect(main.getByRole("heading", { level: 2, name: subject, exact: true })).toBeVisible()
  // "Open related page" is only looked at, never clicked.
  const relatedPage = main
    .getByRole("link", { name: "Open related page" })
    .or(main.getByRole("button", { name: "Open related page" }))
  const relatedHref = inquiry.property
    ? `/properties/${inquiry.property.slug}`
    : inquiry.project
      ? `/apartments/${inquiry.project.slug}`
      : null
  if (relatedHref) await expect(relatedPage).toHaveAttribute("href", relatedHref)
  else await expect(relatedPage).toHaveCount(0)

  await expect(main.getByLabel("Status", { exact: true })).toHaveValue(inquiry.status.toLowerCase())
  await expect(main.getByLabel("Reply note")).toHaveValue(inquiry.reply ?? "")
  await expect(main.getByRole("button", { name: "Save response" })).toBeVisible()
}

/** Which of a booking's three actions its status leaves open. */
const BOOKING_ACTIONS: Record<string, { confirm: boolean; complete: boolean; cancel: boolean }> = {
  PENDING: { confirm: true, complete: false, cancel: true },
  CONFIRMED: { confirm: false, complete: true, cancel: true },
  CANCELLED: { confirm: false, complete: false, cancel: false },
  COMPLETED: { confirm: false, complete: false, cancel: false },
}

/**
 * A booking's page, as the admin sees it. The lifecycle actions are only looked at, never clicked:
 * each is enabled or disabled the way the booking's status says.
 */
async function expectBookingDetail(page: Page, booking: ApiBooking) {
  const subject = booking.property?.title ?? booking.project?.name ?? "General consultation"
  const main = page.getByRole("main")
  const title = h1(page, subject)
  const hero = main.locator("div").filter({ has: title }).last()

  await expect(h1(page, "Booking detail")).toBeVisible(COMPILE)
  await expect(main.getByRole("link", { name: "Back to bookings" })).toHaveAttribute("href", "/admin/bookings")
  await expect(title).toBeVisible()
  await expect(hero.getByText(`${consultationLabel(booking)} booking`, { exact: true })).toBeVisible()
  await expect(hero.getByText(statusLabel(booking.status), { exact: true })).toBeVisible()
  await expect(hero.getByText(stamp("Submitted", booking.createdAt))).toBeVisible()

  await expect(main.getByText(booking.name, { exact: true }).first()).toBeVisible()
  await expect(main.getByRole("link", { name: literal(booking.email) })).toHaveAttribute(
    "href",
    `mailto:${booking.email}`,
  )
  await expect(main.getByRole("link", { name: literal(booking.phone) })).toHaveAttribute("href", `tel:${booking.phone}`)
  await expect(main.getByText(shortDate(booking.preferredDate), { exact: true })).toBeVisible()
  await expect(main.getByText(booking.preferredTime, { exact: true })).toBeVisible()
  await expect(main.getByText(booking.message?.trim() || "No message was added for this booking.")).toBeVisible()

  await expect(main.getByText(stamp("Created:", booking.createdAt))).toBeVisible()
  if (booking.confirmedAt) await expect(main.getByText(stamp("Confirmed:", booking.confirmedAt))).toBeVisible()
  if (booking.cancelledAt) await expect(main.getByText(stamp("Cancelled:", booking.cancelledAt))).toBeVisible()
  if (booking.completedAt) await expect(main.getByText(stamp("Completed:", booking.completedAt))).toBeVisible()

  const allowed = BOOKING_ACTIONS[booking.status]
  const actions = [
    { name: "Confirm booking", enabled: allowed.confirm },
    { name: "Mark completed", enabled: allowed.complete },
    { name: "Cancel booking", enabled: allowed.cancel },
  ]
  for (const { name, enabled } of actions) {
    const button = main.getByRole("button", { name, exact: true })
    if (enabled) await expect(button).toBeEnabled()
    else await expect(button).toBeDisabled()
  }
}

// ─── Inquiries ────────────────────────────────────────────────────────────────

test.describe("inquiries", () => {
  test("lists inquiries as the API holds them, with sender, subject, status and a View action", async ({
    page,
    apiAs,
  }) => {
    const api = await apiAs("admin")
    const { data, meta } = await getJson<List<ApiInquiry>>(api, `inquiries?limit=${DASHBOARD_PAGE_SIZE}`)

    await openSignedIn(page, "/admin/inquiries")

    await expect(h1(page, "Inquiries")).toBeVisible()
    await expect(page.getByRole("columnheader")).toHaveText([
      "From",
      "Type",
      "Related to",
      "Status",
      "Date",
      "Actions",
    ])
    await expect(filterGroup(page, "Status").getByRole("button")).toHaveText(INQUIRY_STATUS_FILTERS)
    await expect(filterGroup(page, "Type").getByRole("button")).toHaveText([
      "All types",
      "Property",
      "Apartment",
      "General",
      "Report",
      "Supplier",
      "Investor",
    ])
    await expect(filterGroup(page, "Status").getByRole("button", { name: "All", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(filterGroup(page, "Type").getByRole("button", { name: "All types" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expectListOf(page, meta.total, NO_INQUIRIES)
    await expectInquiryRows(page, data)
  })

  for (const chip of INQUIRY_STATUS_CHIPS) {
    test(`filters inquiries to the "${chip}" status`, async ({ page, apiAs }) => {
      const api = await apiAs("admin")
      const { data, meta } = await getJson<List<ApiInquiry>>(
        api,
        `inquiries?limit=${DASHBOARD_PAGE_SIZE}&status=${chip.toUpperCase()}`,
      )

      await openSignedIn(page, "/admin/inquiries")
      await chooseFilter(page, "Status", chip, new RegExp(`[?&]status=${chip.toLowerCase()}(&|$)`))

      await expectListOf(page, meta.total, NO_INQUIRIES)
      await expectInquiryRows(page, data)
    })
  }

  for (const { chip, value } of INQUIRY_TYPE_CHIPS) {
    test(`filters inquiries to the "${chip}" type`, async ({ page, apiAs }) => {
      const api = await apiAs("admin")
      const { data, meta } = await getJson<List<ApiInquiry>>(
        api,
        `inquiries?limit=${DASHBOARD_PAGE_SIZE}&type=${value.toUpperCase()}`,
      )

      await openSignedIn(page, "/admin/inquiries")
      await chooseFilter(page, "Type", chip, new RegExp(`[?&]type=${value}(&|$)`))

      await expectListOf(page, meta.total, NO_INQUIRIES)
      await expectInquiryRows(page, data)
    })
  }

  test("combines a status and a type filter", async ({ page, apiAs }) => {
    const api = await apiAs("admin")
    const { data, meta } = await getJson<List<ApiInquiry>>(
      api,
      `inquiries?limit=${DASHBOARD_PAGE_SIZE}&status=READ&type=REPORT`,
    )

    await openSignedIn(page, "/admin/inquiries")
    await chooseFilter(page, "Status", "Read", /[?&]status=read(&|$)/)
    await chooseFilter(page, "Type", "Report", /[?&]type=report(&|$)/)

    // Choosing the type kept the status.
    await expect(page).toHaveURL(/[?&]status=read(&|$)/)
    await expect(filterGroup(page, "Status").getByRole("button", { name: "Read", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expectListOf(page, meta.total, NO_INQUIRIES)
    await expectInquiryRows(page, data)
  })

  test("brings back the full list when a filter is cleared with All", async ({ page, apiAs }) => {
    const api = await apiAs("admin")
    const { data, meta } = await getJson<List<ApiInquiry>>(api, `inquiries?limit=${DASHBOARD_PAGE_SIZE}`)

    await openSignedIn(page, "/admin/inquiries")
    await chooseFilter(page, "Status", "Read", /[?&]status=read(&|$)/)
    await chooseFilter(page, "Status", "All", /^(?!.*status=)/)

    await expectListOf(page, meta.total, NO_INQUIRIES)
    await expectInquiryRows(page, data)
  })

  test("pages through inquiries with the pager", async ({ page, apiAs }) => {
    const api = await apiAs("admin")
    const first = await getJson<List<ApiInquiry>>(api, `inquiries?limit=${DASHBOARD_PAGE_SIZE}`)
    test.skip(first.meta.totalPages < 2, "Needs more than one page of inquiries")
    const second = await getJson<List<ApiInquiry>>(api, `inquiries?limit=${DASHBOARD_PAGE_SIZE}&page=2`)

    await openSignedIn(page, "/admin/inquiries")
    const previous = page.getByRole("button", { name: "Previous page" })
    const next = page.getByRole("button", { name: "Next page" })
    await expect(previous).toBeDisabled()

    await hydrated(next)
    await next.click()
    await expect(page).toHaveURL(/[?&]page=2(&|$)/)
    const lastShown = Math.min(first.meta.total, 2 * DASHBOARD_PAGE_SIZE)
    await expect(pagerLine(page)).toHaveText(`Showing ${DASHBOARD_PAGE_SIZE + 1}-${lastShown} of ${first.meta.total}`)
    await expectInquiryRows(page, second.data)

    await previous.click()
    await expect(page).toHaveURL(/[?&]page=1(&|$)/)
    await expect(pagerLine(page)).toHaveText(`Showing 1-${DASHBOARD_PAGE_SIZE} of ${first.meta.total}`)
    await expectInquiryRows(page, first.data)
  })

  test("does not print an impossible range for a page past the end", { tag: "@known-bug" }, async ({ page, apiAs }) => {
    test.fail(true, KNOWN_BUG.paginationPastEnd)
    const api = await apiAs("admin")
    const { meta } = await getJson<List<ApiInquiry>>(api, `inquiries?limit=${DASHBOARD_PAGE_SIZE}`)
    test.skip(meta.total === 0, "Needs inquiries for the pager to show")

    await openSignedIn(page, `/admin/inquiries?page=${meta.totalPages + 50}`)
    await expect(h1(page, "Inquiries")).toBeVisible()
    // The list is on the page (rows, or its empty-state line), and the pager with it.
    await expect(tableRows(page).first().or(page.getByRole("cell", { name: NO_INQUIRIES }))).toBeVisible()

    // What the page does with a page number past the end is open (an empty list, or the last page),
    // but a "Showing from-to of total" line, when there is one, has to be possible.
    const line = pagerLine(page)
    if ((await line.count()) === 0) return
    const [from, to, total] = (await line.innerText()).match(/\d+/g)!.map(Number)
    expect(from, `the page says "${await line.innerText()}"`).toBeLessThanOrEqual(to)
    expect(to).toBeLessThanOrEqual(total)
  })

  test("opens the first inquiry with its sender, message and response controls", async ({ page, apiAs }) => {
    const api = await apiAs("admin")
    const {
      data: [inquiry],
    } = await getJson<List<ApiInquiry>>(api, "inquiries?limit=1")
    test.skip(!inquiry, "No inquiries in the database to open")

    await openSignedIn(page, "/admin/inquiries")
    await viewAction(tableRows(page).first()).click()
    await expect(page).toHaveURL(`/admin/inquiries/${inquiry.id}`, COMPILE)
    await expectInquiryDetail(page, inquiry)

    // The way back is a link, not the browser's Back button.
    await page.getByRole("link", { name: "Back to inquiries" }).click()
    await expect(page).toHaveURL("/admin/inquiries")
    await expect(h1(page, "Inquiries")).toBeVisible()
  })

  test.describe("an inquiry that does not exist", () => {
    // Next may answer the page with a 404, and that is the point of this test.
    test.use({ allowedErrors: [new RegExp(`/admin/inquiries/${MISSING_ID} -> 404`)] })

    test("shows the not-found page", async ({ page }) => {
      await openSignedIn(page, `/admin/inquiries/${MISSING_ID}`)
      await expect(page.getByText("This page could not be found.")).toBeVisible()
    })
  })
})

// ─── Bookings ─────────────────────────────────────────────────────────────────

test.describe("bookings", () => {
  test("lists bookings as the API holds them, with client, appointment, status and a View action", async ({
    page,
    apiAs,
  }) => {
    const api = await apiAs("admin")
    const { data, meta } = await getJson<List<ApiBooking>>(api, `bookings?limit=${DASHBOARD_PAGE_SIZE}`)

    await openSignedIn(page, "/admin/bookings")

    await expect(h1(page, "Bookings")).toBeVisible()
    await expect(page.getByRole("columnheader")).toHaveText([
      "Client",
      "Consultation",
      "Related to",
      "Appointment",
      "Status",
      "Submitted",
      "Actions",
    ])
    await expect(filterGroup(page, "Status").getByRole("button")).toHaveText([
      "All",
      "Pending",
      "Confirmed",
      "Cancelled",
      "Completed",
    ])
    await expect(filterGroup(page, "Status").getByRole("button", { name: "All", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expectListOf(page, meta.total, NO_BOOKINGS)
    await expectBookingRows(page, data)
  })

  // Only a status that has bookings can prove a chip works: for one with none, the page shows the same
  // empty list whether the filter worked or its API call failed (the page turns an API error into an
  // empty list, which is what happens today for every status chip).
  test("filters bookings to a status that has bookings", { tag: "@known-bug" }, async ({ page, apiAs }) => {
    test.fail(true, KNOWN_BUG.bookingStatusCase)
    const api = await apiAs("admin")
    let chosen: { chip: string; list: List<ApiBooking> } | undefined
    for (const chip of BOOKING_STATUS_CHIPS) {
      const list = await getJson<List<ApiBooking>>(api, `bookings?limit=${DASHBOARD_PAGE_SIZE}&status=${chip.toUpperCase()}`)
      if (list.meta.total > 0) {
        chosen = { chip, list }
        break
      }
    }
    test.skip(!chosen, "No bookings in the database to filter")
    if (!chosen) return

    await openSignedIn(page, "/admin/bookings")
    await chooseFilter(page, "Status", chosen.chip, new RegExp(`[?&]status=${chosen.chip.toLowerCase()}(&|$)`))

    await expectListOf(page, chosen.list.meta.total, NO_BOOKINGS)
    await expectBookingRows(page, chosen.list.data)
  })

  test("opens the first booking with its client, appointment and lifecycle actions", async ({ page, apiAs }) => {
    const api = await apiAs("admin")
    const {
      data: [booking],
    } = await getJson<List<ApiBooking>>(api, "bookings?limit=1")
    test.skip(!booking, "No bookings in the database to open")

    await openSignedIn(page, "/admin/bookings")
    await viewAction(tableRows(page).first()).click()
    await expect(page).toHaveURL(`/admin/bookings/${booking.id}`, COMPILE)
    await expectBookingDetail(page, booking)

    await page.getByRole("link", { name: "Back to bookings" }).click()
    await expect(page).toHaveURL("/admin/bookings")
    await expect(h1(page, "Bookings")).toBeVisible()
  })

  test.describe("a booking that does not exist", () => {
    test.use({ allowedErrors: [new RegExp(`/admin/bookings/${MISSING_ID} -> 404`)] })

    test("shows the not-found page", async ({ page }) => {
      await openSignedIn(page, `/admin/bookings/${MISSING_ID}`)
      await expect(page.getByText("This page could not be found.")).toBeVisible()
    })
  })
})

// ─── Supplier and investor requests ───────────────────────────────────────────

// Both pages are the inquiries table locked to one type: no Type chips, and every row says which
// kind of application it is. A row's View goes to the ordinary inquiry page.
for (const { path, heading, type, application } of PARTNER_REQUESTS) {
  test.describe(heading.toLowerCase(), () => {
    test(`lists only ${type} applications, with the type locked`, async ({ page, apiAs }) => {
      const api = await apiAs("admin")
      const { data, meta } = await getJson<List<ApiInquiry>>(
        api,
        `inquiries?limit=${DASHBOARD_PAGE_SIZE}&type=${type.toUpperCase()}`,
      )

      await openSignedIn(page, path)

      await expect(h1(page, heading)).toBeVisible()
      await expect(filterGroup(page, "Status").getByRole("button")).toHaveText(INQUIRY_STATUS_FILTERS)
      await expect(filterGroup(page, "Type")).toHaveCount(0)
      await expectListOf(page, meta.total, NO_INQUIRIES)
      await expectInquiryRows(page, data)
      await expect(tableRows(page).filter({ hasNot: page.getByText(application, { exact: true }) })).toHaveCount(0)
    })

    test(`filters ${type} applications by status and keeps the type locked`, async ({ page, apiAs }) => {
      const api = await apiAs("admin")
      // The first status that has any of this kind, so the filter has something to show.
      let status = "Read"
      for (const chip of INQUIRY_STATUS_CHIPS) {
        const { meta } = await getJson<List<ApiInquiry>>(
          api,
          `inquiries?limit=1&type=${type.toUpperCase()}&status=${chip.toUpperCase()}`,
        )
        if (meta.total > 0) {
          status = chip
          break
        }
      }
      const { data, meta } = await getJson<List<ApiInquiry>>(
        api,
        `inquiries?limit=${DASHBOARD_PAGE_SIZE}&type=${type.toUpperCase()}&status=${status.toUpperCase()}`,
      )

      await openSignedIn(page, path)
      await chooseFilter(page, "Status", status, new RegExp(`[?&]status=${status.toLowerCase()}(&|$)`))

      await expect(page).not.toHaveURL(/[?&]type=/)
      await expectListOf(page, meta.total, NO_INQUIRIES)
      await expectInquiryRows(page, data)
    })

    test(`opens the first ${type} application in the inquiry page`, async ({ page, apiAs }) => {
      const api = await apiAs("admin")
      const {
        data: [inquiry],
      } = await getJson<List<ApiInquiry>>(api, `inquiries?limit=1&type=${type.toUpperCase()}`)
      test.skip(!inquiry, `No ${type} applications in the database to open`)

      await openSignedIn(page, path)
      await viewAction(tableRows(page).first()).click()
      await expect(page).toHaveURL(`/admin/inquiries/${inquiry.id}`, COMPILE)
      await expectInquiryDetail(page, inquiry)
    })
  })
}

// ─── Notifications ────────────────────────────────────────────────────────────

test.describe("notifications", () => {
  test("lists the admin's notifications, newest first, with the unread count", async ({ page, apiAs }) => {
    const api = await apiAs("admin")
    const inbox = await getJson<Inbox>(api, "notifications?limit=50")

    await openSignedIn(page, "/notifications")

    await expect(h1(page, "Notifications")).toBeVisible()
    await expect(page.getByText(`${inbox.unread} unread`, { exact: true })).toBeVisible()

    if (inbox.data.length === 0) {
      await expect(page.getByRole("heading", { level: 2, name: "You are all caught up" })).toBeVisible()
      return
    }

    const newest = inbox.data[0]
    const items = page.getByRole("list").filter({ hasText: newest.title }).getByRole("listitem")
    await expect(items).toHaveCount(inbox.data.length)
    await expect(items.first()).toContainText(newest.title)
    await expect(items.first()).toContainText(newest.message)
    if (newest.link) await expect(items.first().getByRole("link")).toHaveAttribute("href", newest.link)
    // The unread ones carry a screen-reader "(unread)" mark.
    await expect(items.filter({ hasText: "(unread)" })).toHaveCount(inbox.data.filter((n) => !n.isRead).length)
  })

  test("opens the full list from the bell in the header", async ({ page, apiAs }) => {
    const api = await apiAs("admin")
    const inbox = await getJson<Inbox>(api, "notifications?limit=10")

    await openSignedIn(page, "/admin/inquiries")
    const bell = page.getByRole("button", { name: /^Notifications/ })
    await hydrated(bell)
    await bell.click()

    // Only look at the panel: clicking a notification in it would mark that one read.
    if (inbox.data.length === 0) await expect(page.getByText("You're all caught up.")).toBeVisible()
    else await expect(page.getByRole("button", { name: literal(inbox.data[0].title) }).first()).toBeVisible()

    await page.getByRole("link", { name: "View all notifications" }).click()
    await expect(page).toHaveURL("/notifications", COMPILE)
    await expect(h1(page, "Notifications")).toBeVisible(COMPILE)
  })
})

// ─── Moving around ────────────────────────────────────────────────────────────

test("moves between the operations pages from the sidebar", async ({ page }) => {
  await openSignedIn(page, "/admin/inquiries")
  const sidebar = page.getByRole("complementary", { name: "Admin Workspace navigation" })

  for (const { label, path } of [
    { label: "Bookings", path: "/admin/bookings" },
    { label: "Supplier Requests", path: "/admin/supplier-requests" },
    { label: "Investor Requests", path: "/admin/investor-requests" },
    { label: "Inquiries", path: "/admin/inquiries" },
  ]) {
    const link = sidebar.getByRole("link", { name: label, exact: true })
    await link.click()
    await expect(page).toHaveURL(path, COMPILE)
    await expect(h1(page, label)).toBeVisible(COMPILE)
    await expect(link).toHaveAttribute("aria-current", "page")
  }
})
