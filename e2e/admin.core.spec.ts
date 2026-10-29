import type { Locator, Page } from '@playwright/test'
import { DASHBOARD_PAGE_SIZE } from '../src/lib/constants'
import { expect, test } from './fixtures'
import {
  COMPILE,
  KNOWN_BUG,
  escapeRegExp,
  getJson,
  hydrated,
  linkOrButton,
  openSignedIn,
  pagerLine,
} from './helpers'

// Admin core: the dashboard, users, sellers, properties, reports, settings and apartments.
//
// Every test here is VIEW ONLY. The admin pages carry buttons that approve, reject, feature,
// verify, change a role, delete or save. None of them is ever clicked, and no field is typed into.
// The only clicks are links that navigate (View, Edit apartment, Add Apartment, Back, page
// numbers) and the filter chips, which just rewrite the URL.
//
// Many admin pages load their data on the Next server and turn an API error into an empty list or
// zeros (the dashboard and reports do, settings falls back to the site config), and the browser
// never sees those calls. So each test reads the same endpoint through apiAs('admin') and
// asserts that the page shows what the API returned, rather than only that nothing errored.

// A click that lands on a route `next dev` has not compiled yet waits for that compile, so waits that
// follow such a click use COMPILE; a button clicked before React hydrates does nothing, so chips and
// the pager wait for `hydrated()` first.

const PAGE_SIZE = DASHBOARD_PAGE_SIZE

type ApiMeta = { page: number; limit: number; total: number; totalPages: number }
type ApiOne<T> = { data: T }
type ApiPage<T> = { data: T[]; meta: ApiMeta }

type ApiRole = 'ADMIN' | 'SELLER' | 'BUYER'
type ApiUser = { id: string; name: string; email: string; role: ApiRole; isVerified: boolean }
type ApiProperty = { id: string; slug: string; title: string; status: string }
type ApiProject = {
  id: string
  name: string
  status: string
  location?: string | null
  developerName?: string | null
}
type ApiInquiry = {
  id: string
  name: string
  status: string
  propertyId?: string | null
  propertyTitle?: string | null
  property?: { title: string } | null
}
type ApiSettings = { siteName: string; contactEmail: string; phone: string }
type ApiChartPoint = { label: string; value: number }
type ApiAdminDashboard = {
  totalProperties: number
  pendingListings: number
  verifiedListings: number
  totalUsers: number
  totalSellers: number
  totalInquiries: number
  totalBookings: number
  monthlyListings: ApiChartPoint[]
  inquiryByType: ApiChartPoint[]
  monthlyBookings: ApiChartPoint[]
  propertyStatusByQuarter: { label: string; pending: number; approved: number; verified: number }[]
  recentActivity: { id: string; title: string; description: string }[]
}

const ROLE_LABEL: Record<ApiRole, string> = { ADMIN: 'Admin', SELLER: 'Seller', BUYER: 'Buyer' }
const LISTING_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  VERIFIED: 'Verified',
  FEATURED: 'Featured',
  REJECTED: 'Rejected',
}
const PROJECT_STATUS_LABEL: Record<string, string> = {
  ONGOING: 'Ongoing',
  UPCOMING: 'Upcoming',
  COMPLETED: 'Completed',
}
/** A report is an inquiry; the page names its status "open" (new), "reviewed" (read) or "resolved" (replied or closed). */
const REPORT_STATUS_LABEL: Record<string, string> = {
  NEW: 'open',
  READ: 'reviewed',
  REPLIED: 'resolved',
  CLOSED: 'resolved',
}

// ── tables ────────────────────────────────────────────────────────────────────────────────────

/** Body rows of the visible data table. An empty list is a single row that holds the empty note. */
const dataRows = (page: Page) =>
  page.getByRole('table').getByRole('row').filter({ has: page.getByRole('cell') })

const emptyNote = (page: Page, text: string) => page.getByRole('cell', { name: text })

/** The table holds exactly `count` records, or, for 0, its empty note. */
async function expectRecords(page: Page, count: number, emptyText: string) {
  if (count === 0) {
    await expect(emptyNote(page, emptyText)).toBeVisible()
    return
  }
  await expect(emptyNote(page, emptyText)).toHaveCount(0)
  await expect(dataRows(page)).toHaveCount(count)
}

async function expectColumns(page: Page, names: string[]) {
  for (const name of names) {
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible()
  }
}

/**
 * The Status column shows each record's status, whatever order the rows come in: for every label,
 * the table holds as many status cells as the API reports records with that status.
 */
async function expectStatusCells(page: Page, statuses: string[], labelOf: Record<string, string>) {
  const labels = [...new Set(Object.values(labelOf))]
  for (const label of labels) {
    const expected = statuses.filter((status) => labelOf[status] === label).length
    await expect(
      page.getByRole('table').getByRole('cell', { name: new RegExp(`^${escapeRegExp(label)}$`, 'i') }),
      `${label} status cells`,
    ).toHaveCount(expected)
  }
}

function showingLine({ page, limit, total }: ApiMeta) {
  return `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total}`
}

async function expectShowing(page: Page, meta: ApiMeta) {
  if (meta.total === 0) return
  await expect(pagerLine(page)).toHaveText(showingLine(meta))
}

/**
 * A row control that navigates. The names are typed narrowly so a test cannot reach for the
 * approve, reject, feature, verify or delete controls that sit next to them.
 */
type NavigatingRowAction = 'View' | 'View listing' | 'Edit apartment'
const rowAction = (row: Locator, name: NavigatingRowAction) => linkOrButton(row, name)

/** A filter chip. Chips only rewrite the URL's query string. */
const chip = (page: Page, group: string, label: string) =>
  page.getByRole('group', { name: group, exact: true }).getByRole('button', { name: label, exact: true })

/** Picks a filter chip and waits for the URL to carry the filter. */
async function pickChip(page: Page, group: string, label: string, query: RegExp) {
  await hydrated(chip(page, group, label))
  await chip(page, group, label).click()
  await expect(page, `the "${label}" chip filters the URL`).toHaveURL(query, COMPILE)
  await expect(chip(page, group, label)).toHaveAttribute('aria-pressed', 'true')
}

// ── dashboard ─────────────────────────────────────────────────────────────────────────────────

/** The number in a stat card. The card is the smallest block holding both its label and a value. */
function statValue(page: Page, label: string): Locator {
  const value = /^(\d+|—)$/
  return page
    .locator('div')
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ has: page.getByText(value) })
    .last()
    .getByText(value)
}

/** A chart card: the smallest block holding the chart's title and either its plot or its empty note. */
function chartCard(page: Page, title: string): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { level: 3, name: title, exact: true }) })
    .filter({ has: page.getByRole('application').or(page.getByText(/^No .+ data yet$/)) })
    .last()
}

test.describe('admin dashboard', () => {
  test('greets the admin by first name and counts the listings waiting for review', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const { data: me } = await getJson<ApiOne<ApiUser>>(api, 'auth/me')
    const { data: dashboard } = await getJson<ApiOne<ApiAdminDashboard>>(api, 'dashboard/admin')

    await openSignedIn(page, '/admin/dashboard')

    const firstName = me.name.split(' ')[0]
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: new RegExp(`^Good (morning|afternoon|evening), ${escapeRegExp(firstName)}\\b`),
      }),
    ).toBeVisible()
    const pending = dashboard.pendingListings
    await expect(
      page.getByText(`You have ${pending} pending listing${pending === 1 ? '' : 's'} waiting for review.`),
    ).toBeVisible()
  })

  test('shows the eight stat cards with the platform totals', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const { data: dashboard } = await getJson<ApiOne<ApiAdminDashboard>>(api, 'dashboard/admin')
    // The server swallows a failed dashboard call into zeros, so the totals must come from a live API.
    expect(dashboard.totalProperties, 'the database has listings').toBeGreaterThan(0)

    await openSignedIn(page, '/admin/dashboard')

    const totals: [label: string, value: number][] = [
      ['Total Properties', dashboard.totalProperties],
      ['Pending Listings', dashboard.pendingListings],
      ['Total Users', dashboard.totalUsers],
      ['Total Inquiries', dashboard.totalInquiries],
      ['Total Bookings', dashboard.totalBookings],
      ['Verified Listings', dashboard.verifiedListings],
      ['Total Sellers', dashboard.totalSellers],
    ]
    for (const [label, value] of totals) {
      await expect(statValue(page, label), `${label} card`).toHaveText(String(value))
    }
    // Revenue is not wired to billing yet, so it shows a dash and says why.
    await expect(statValue(page, 'Revenue')).toHaveText('—')
    await expect(page.getByText('Billing not configured')).toBeVisible()
  })

  test('draws the four charts from the live series', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const { data: dashboard } = await getJson<ApiOne<ApiAdminDashboard>>(api, 'dashboard/admin')

    await openSignedIn(page, '/admin/dashboard')

    const charts = [
      { title: 'Listings per month', points: dashboard.monthlyListings.length, empty: 'No listing data yet' },
      { title: 'Inquiries by type', points: dashboard.inquiryByType.length, empty: 'No inquiry data yet' },
      { title: 'Bookings trend', points: dashboard.monthlyBookings.length, empty: 'No booking data yet' },
      {
        title: 'Listing health by quarter',
        points: dashboard.propertyStatusByQuarter.length,
        empty: 'No status data yet',
      },
    ]
    for (const { title, points, empty } of charts) {
      const card = chartCard(page, title)
      if (points === 0) {
        await expect(card.getByText(empty), `${title} has no data to draw`).toBeVisible()
        continue
      }
      await expect(card.getByRole('application'), `${title} is plotted`).toBeVisible()
      await expect(card.getByText(empty)).toHaveCount(0)
    }

    // The legends and axes name what was plotted.
    const inquiryCard = chartCard(page, 'Inquiries by type')
    for (const { label } of dashboard.inquiryByType) {
      await expect(inquiryCard.getByText(label, { exact: true }), `inquiry type ${label}`).toBeVisible()
    }
    const healthCard = chartCard(page, 'Listing health by quarter')
    for (const series of ['pending', 'approved', 'verified']) {
      await expect(healthCard.getByText(series, { exact: true }), `${series} legend`).toBeVisible()
    }
    for (const { label } of dashboard.propertyStatusByQuarter) {
      await expect(healthCard.getByText(label, { exact: true }), `quarter ${label}`).toBeVisible()
    }
  })

  test('lists the latest platform activity, newest first', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const { data: dashboard } = await getJson<ApiOne<ApiAdminDashboard>>(api, 'dashboard/admin')
    const feed = dashboard.recentActivity

    await openSignedIn(page, '/admin/dashboard')

    await expect(page.getByRole('heading', { level: 3, name: 'Recent activity' })).toBeVisible()
    if (feed.length === 0) {
      await expect(page.getByText('No recent activity')).toBeVisible()
      return
    }
    // The card shows the newest eight; each entry carries its date in a <time>.
    const items = page.getByRole('listitem').filter({ has: page.getByRole('time') })
    await expect(items).toHaveCount(Math.min(feed.length, 8))
    await expect(items.first()).toContainText(feed[0].title)
    await expect(items.first()).toContainText(feed[0].description)
  })

  test('offers quick actions into apartments, inquiries and reports', async ({ page }) => {
    await openSignedIn(page, '/admin/dashboard')

    const shortcuts = [
      { name: /^Add Apartment/, href: '/admin/projects' },
      { name: /^Active Inquiries/, href: '/admin/inquiries' },
      { name: /^Open Reports/, href: '/admin/reports' },
      { name: 'Manage apartments', href: '/admin/projects' },
    ]
    for (const { name, href } of shortcuts) {
      await expect(page.getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })
})

// ── users ─────────────────────────────────────────────────────────────────────────────────────

test.describe('admin users', () => {
  test('lists the accounts with their role and verification', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const users = await getJson<ApiPage<ApiUser>>(api, `users?page=1&limit=${PAGE_SIZE}`)
    expect(users.data.length, 'the admin is at least one user').toBeGreaterThan(0)

    await openSignedIn(page, '/admin/users')

    await expect(page.getByRole('heading', { level: 1, name: 'Users', exact: true })).toBeVisible()
    await expectColumns(page, ['User', 'Role', 'Verified', 'Actions'])
    await expectRecords(page, users.data.length, 'No users match this filter.')
    for (const user of users.data) {
      const row = dataRows(page).filter({ has: page.getByText(user.email, { exact: true }) })
      await expect(row.getByText(user.name, { exact: true }).first(), `${user.email} name`).toBeVisible()
      // The role cell holds nothing but the role, so an account named "Buyer" cannot be mistaken for it.
      await expect(
        row.getByRole('cell').filter({ hasText: /^(Admin|Seller|Buyer)$/ }),
        `${user.email} role`,
      ).toHaveText(ROLE_LABEL[user.role])
      await expect(row.getByText('Verified', { exact: true }), `${user.email} verified badge`).toHaveCount(
        user.isVerified ? 1 : 0,
      )
    }
    await expectShowing(page, users.meta)
  })

  test('filters the users by role from the chips', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const sellers = await getJson<ApiPage<ApiUser>>(api, `users?role=SELLER&page=1&limit=${PAGE_SIZE}`)

    await openSignedIn(page, '/admin/users')
    await expect(chip(page, 'Role', 'All')).toHaveAttribute('aria-pressed', 'true')
    await pickChip(page, 'Role', 'Sellers', /[?&]role=seller(&|$)/)

    await expectRecords(page, sellers.data.length, 'No users match this filter.')
    if (sellers.data.length > 0) {
      await expect(
        dataRows(page).filter({ hasNot: page.getByRole('cell', { name: 'Seller', exact: true }) }),
        'every account listed under "Sellers" is a seller',
      ).toHaveCount(0)
    }
    await expectShowing(page, sellers.meta)
  })

  test("opens the first user's detail page without changing anything", async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const { data: me } = await getJson<ApiOne<ApiUser>>(api, 'auth/me')

    await openSignedIn(page, '/admin/users')
    await rowAction(dataRows(page).first(), 'View').click()

    await expect(page).toHaveURL(/\/admin\/users\/[0-9a-f]{24}$/, COMPILE)
    const id = new URL(page.url()).pathname.split('/').at(-1)
    const { data: user } = await getJson<ApiOne<ApiUser>>(api, `users/${id}`)

    await expect(page.getByRole('heading', { level: 1, name: 'User detail' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: user.name, exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: user.email })).toHaveAttribute('href', `mailto:${user.email}`)

    // The role selector shows the account's role as the pressed one. It is never clicked.
    for (const role of Object.keys(ROLE_LABEL) as ApiRole[]) {
      await expect(page.getByRole('button', { name: ROLE_LABEL[role], exact: true }), `${role} option`).toHaveAttribute(
        'aria-pressed',
        String(role === user.role),
      )
    }
    // An admin cannot demote themselves from here.
    await expect(page.getByText("You can't change your own role from here.")).toHaveCount(user.id === me.id ? 1 : 0)

    // The verification panel says where the account stands and offers the opposite action (not clicked).
    await expect(
      page.getByText(user.isVerified ? 'This account is currently verified.' : 'This account has not been verified yet.'),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: user.isVerified ? 'Remove verification' : 'Verify user', exact: true }),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/users$/, COMPILE)
  })
})

// ── sellers ───────────────────────────────────────────────────────────────────────────────────

test.describe('admin sellers', () => {
  test('lists the sellers with their verification status', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const sellers = await getJson<ApiPage<ApiUser>>(api, `users?role=SELLER&page=1&limit=${PAGE_SIZE}`)

    await openSignedIn(page, '/admin/sellers')

    await expect(page.getByRole('heading', { level: 1, name: 'Sellers', exact: true })).toBeVisible()
    await expectColumns(page, ['Seller', 'Status', 'Actions'])
    await expectRecords(page, sellers.data.length, 'No sellers match this filter.')
    for (const seller of sellers.data) {
      const row = dataRows(page).filter({ has: page.getByText(seller.email, { exact: true }) })
      await expect(row.getByText(seller.name, { exact: true }), `${seller.email} name`).toBeVisible()
      await expect(row.getByText(/^(Verified|Pending)$/), `${seller.email} status`).toHaveText(
        seller.isVerified ? 'Verified' : 'Pending',
      )
      await expect(rowAction(row, 'View'), `${seller.email} detail link`).toHaveAttribute(
        'href',
        `/admin/users/${seller.id}`,
      )
    }
    await expectShowing(page, sellers.meta)
  })

  test('lists only sellers still awaiting verification under the Pending verification chip', { tag: '@known-bug' }, async ({
    page,
    apiAs,
  }) => {
    test.fail(true, KNOWN_BUG.usersVerifiedFilter)
    const api = await apiAs('admin')
    const sellers = await getJson<ApiPage<ApiUser>>(api, 'users?role=SELLER&page=1&limit=100')
    test.skip(!sellers.data.some((seller) => seller.isVerified), 'No seller is verified, so the chip has nobody to leave out')
    const pending = await getJson<ApiPage<ApiUser>>(
      api,
      `users?role=SELLER&verified=false&page=1&limit=${PAGE_SIZE}`,
    )
    // Soft: the cause (the API ignores verified=false) and the symptom below (the chip lists a verified
    // seller) are reported together.
    expect.soft(
      pending.data.filter((seller) => seller.isVerified).map((seller) => seller.email),
      'GET users?verified=false must not return verified accounts',
    ).toEqual([])

    await openSignedIn(page, '/admin/sellers')
    await pickChip(page, 'Verification', 'Pending verification', /[?&]verified=false(&|$)/)

    await expectRecords(page, pending.data.length, 'No sellers match this filter.')
    if (pending.data.length > 0) {
      await expect(
        dataRows(page).filter({ hasNot: page.getByText('Pending', { exact: true }) }),
        'every seller under "Pending verification" shows the Pending status',
      ).toHaveCount(0)
    }
    await expectShowing(page, pending.meta)
  })

  test('lists only verified sellers under the Verified chip', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const verified = await getJson<ApiPage<ApiUser>>(
      api,
      `users?role=SELLER&verified=true&page=1&limit=${PAGE_SIZE}`,
    )

    await openSignedIn(page, '/admin/sellers')
    await pickChip(page, 'Verification', 'Verified', /[?&]verified=true(&|$)/)

    await expectRecords(page, verified.data.length, 'No sellers match this filter.')
    if (verified.data.length > 0) {
      await expect(
        dataRows(page).filter({ hasNot: page.getByText('Verified', { exact: true }) }),
        'every seller under "Verified" shows the Verified status',
      ).toHaveCount(0)
    }
    await expectShowing(page, verified.meta)
  })
})

// ── properties ────────────────────────────────────────────────────────────────────────────────

test.describe('admin properties', () => {
  test('lists the listings of every status, ten to a page', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const listings = await getJson<ApiPage<ApiProperty>>(api, `properties?page=1&limit=${PAGE_SIZE}`)
    expect(listings.data.length, 'the database has listings').toBeGreaterThan(0)

    await openSignedIn(page, '/admin/properties')

    await expect(page.getByRole('heading', { level: 1, name: 'Properties', exact: true })).toBeVisible()
    await expectColumns(page, ['Listing', 'Price', 'Status', 'Actions'])
    for (const label of ['All', 'Pending', 'Approved', 'Verified', 'Featured', 'Rejected']) {
      await expect(chip(page, 'Status', label)).toBeVisible()
    }
    await expectRecords(page, listings.data.length, 'No listings match this filter.')
    for (const title of new Set(listings.data.map((listing) => listing.title))) {
      await expect(
        page.getByRole('table').getByRole('link', { name: title, exact: true }).first(),
        `listing "${title}"`,
      ).toBeVisible()
    }
    await expectStatusCells(page, listings.data.map((listing) => listing.status), LISTING_STATUS_LABEL)
    // Every row carries a price in taka and a link to the public listing.
    await expect(dataRows(page).filter({ hasNotText: '৳' })).toHaveCount(0)
    await expect(rowAction(dataRows(page).first(), 'View listing')).toHaveAttribute('href', /^\/properties\/.+/)
    await expectShowing(page, listings.meta)
  })

  test('filters the listings still pending review', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const pending = await getJson<ApiPage<ApiProperty>>(
      api,
      `properties?status=PENDING&page=1&limit=${PAGE_SIZE}`,
    )

    await openSignedIn(page, '/admin/properties')
    await pickChip(page, 'Status', 'Pending', /[?&]status=pending(&|$)/)

    await expectRecords(page, pending.data.length, 'No listings match this filter.')
    if (pending.data.length > 0) {
      await expect(
        dataRows(page).filter({ hasNot: page.getByRole('cell', { name: 'Pending', exact: true }) }),
        'every listing under "Pending" has the Pending status',
      ).toHaveCount(0)
    }
    await expectShowing(page, pending.meta)
  })

  test('pages through the listings', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const second = await getJson<ApiPage<ApiProperty>>(api, `properties?page=2&limit=${PAGE_SIZE}`)
    test.skip(second.meta.totalPages < 2, 'all listings fit on one page')

    await openSignedIn(page, '/admin/properties')
    const pageTwo = page.getByRole('navigation', { name: 'Pagination' }).getByRole('button', { name: '2', exact: true })
    await hydrated(pageTwo)
    await pageTwo.click()

    await expect(page).toHaveURL(/[?&]page=2(&|$)/, COMPILE)
    await expect(pageTwo).toHaveAttribute('aria-current', 'page')
    await expectRecords(page, second.data.length, 'No listings match this filter.')
    for (const title of new Set(second.data.map((listing) => listing.title))) {
      await expect(
        page.getByRole('table').getByRole('link', { name: title, exact: true }).first(),
        `listing "${title}"`,
      ).toBeVisible()
    }
    await expectShowing(page, second.meta)
  })
})

// ── reports ───────────────────────────────────────────────────────────────────────────────────

test.describe('admin reports', () => {
  test('lists the listing reports users filed', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const reports = await getJson<ApiPage<ApiInquiry>>(api, `inquiries?type=REPORT&page=1&limit=${PAGE_SIZE}`)

    await openSignedIn(page, '/admin/reports')

    await expect(page.getByRole('heading', { level: 1, name: 'Reports', exact: true })).toBeVisible()
    for (const label of ['All', 'Open', 'Reviewed', 'Resolved']) {
      await expect(chip(page, 'Status', label)).toBeVisible()
    }
    await expectColumns(page, ['Listing', 'Reported by', 'Status', 'Actions'])
    // The page turns a failed inquiries call into an empty list, so the count must match the API.
    await expectRecords(page, reports.data.length, 'No reports match this filter.')
    for (const report of reports.data) {
      const listing = report.propertyTitle ?? report.property?.title ?? report.propertyId
      if (listing) {
        await expect(dataRows(page).getByText(listing, { exact: true }).first(), `report on ${listing}`).toBeVisible()
      }
      await expect(dataRows(page).getByText(report.name, { exact: true }).first(), `reporter ${report.name}`).toBeVisible()
    }
    await expectStatusCells(page, reports.data.map((report) => report.status), REPORT_STATUS_LABEL)
    await expectShowing(page, reports.meta)
  })

  test('filters the reports an admin has already read', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const reviewed = await getJson<ApiPage<ApiInquiry>>(
      api,
      `inquiries?type=REPORT&status=READ&page=1&limit=${PAGE_SIZE}`,
    )

    await openSignedIn(page, '/admin/reports')
    await pickChip(page, 'Status', 'Reviewed', /[?&]status=reviewed(&|$)/)

    await expectRecords(page, reviewed.data.length, 'No reports match this filter.')
    if (reviewed.data.length > 0) {
      await expect(
        dataRows(page).filter({ hasNot: page.getByText(/^reviewed$/i) }),
        'every report under "Reviewed" is marked reviewed',
      ).toHaveCount(0)
    }
    await expectShowing(page, reviewed.meta)
  })
})

// ── settings ──────────────────────────────────────────────────────────────────────────────────

test.describe('admin settings', () => {
  test('shows the saved site settings in the form, without saving', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const { data: settings } = await getJson<ApiOne<ApiSettings>>(api, 'settings')

    await openSignedIn(page, '/admin/settings')

    await expect(page.getByRole('heading', { level: 1, name: 'Settings', exact: true })).toBeVisible()
    // On a failed settings call the page quietly falls back to the site config, so compare with the API.
    await expect(page.getByLabel('Site Name')).toHaveValue(settings.siteName)
    await expect(page.getByLabel('Contact Email')).toHaveValue(settings.contactEmail)
    await expect(page.getByLabel('Phone Number')).toHaveValue(settings.phone)
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled()
  })
})

// ── apartments (projects) ─────────────────────────────────────────────────────────────────────

test.describe('admin apartments', () => {
  test("lists Alivia's apartments with their status", async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const projects = await getJson<ApiPage<ApiProject>>(api, `projects?page=1&limit=${PAGE_SIZE}`)
    expect(projects.data.length, 'the database has apartments').toBeGreaterThan(0)

    await openSignedIn(page, '/admin/projects')

    await expect(page.getByRole('heading', { level: 1, name: 'Apartments', exact: true })).toBeVisible()
    await expect(linkOrButton(page, 'Add Apartment')).toHaveAttribute('href', '/admin/projects/create')
    for (const label of ['All', 'Ongoing', 'Upcoming', 'Completed']) {
      await expect(chip(page, 'Status', label)).toBeVisible()
    }
    await expectColumns(page, ['Apartment', 'Status', 'Units', 'Actions'])
    await expectRecords(page, projects.data.length, 'No apartments match this filter.')
    for (const name of new Set(projects.data.map((project) => project.name))) {
      await expect(
        page.getByRole('table').getByRole('link', { name, exact: true }).first(),
        `apartment "${name}"`,
      ).toBeVisible()
    }
    await expectStatusCells(page, projects.data.map((project) => project.status), PROJECT_STATUS_LABEL)
    await expectShowing(page, projects.meta)
  })

  test('filters the apartments that are ongoing', async ({ page, apiAs }) => {
    const api = await apiAs('admin')
    const ongoing = await getJson<ApiPage<ApiProject>>(api, `projects?status=ONGOING&page=1&limit=${PAGE_SIZE}`)

    await openSignedIn(page, '/admin/projects')
    await pickChip(page, 'Status', 'Ongoing', /[?&]status=ongoing(&|$)/)

    await expectRecords(page, ongoing.data.length, 'No apartments match this filter.')
    if (ongoing.data.length > 0) {
      await expect(
        dataRows(page).filter({ hasNot: page.getByRole('cell', { name: 'Ongoing', exact: true }) }),
        'every apartment under "Ongoing" has the Ongoing status',
      ).toHaveCount(0)
    }
    await expectShowing(page, ongoing.meta)
  })

  test('opens the empty create form without submitting it', async ({ page }) => {
    await openSignedIn(page, '/admin/projects')
    await linkOrButton(page, 'Add Apartment').click()

    await expect(page).toHaveURL(/\/admin\/projects\/create$/, COMPILE)
    await expect(page.getByRole('heading', { level: 1, name: 'Add Apartment', exact: true })).toBeVisible()
    await expect(linkOrButton(page, 'Back to Apartments')).toHaveAttribute('href', '/admin/projects')

    // A new apartment starts blank, as "upcoming".
    await expect(page.getByLabel('Apartment Name')).toHaveValue('')
    await expect(page.getByLabel('Location', { exact: true })).toHaveValue('')
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('upcoming')
    for (const label of ['Tagline', 'Description', 'Developer', 'Full Address', 'Handover Date', 'Price From (BDT)', 'Price To (BDT)']) {
      await expect(page.getByLabel(label)).toBeVisible()
    }
    for (const section of ['Media', 'Amenities', 'Unit types', 'Views & Pricing', 'Nearby Landmarks']) {
      await expect(page.getByRole('heading', { level: 2, name: section, exact: true })).toBeVisible()
    }
    await expect(page.getByText('No unit types added yet.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create Apartment', exact: true })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled()
  })

  test("opens the first apartment's edit form pre-filled, without saving", async ({ page, apiAs }) => {
    const api = await apiAs('admin')

    await openSignedIn(page, '/admin/projects')
    await rowAction(dataRows(page).first(), 'Edit apartment').click()

    await expect(page).toHaveURL(/\/admin\/projects\/[0-9a-f]{24}\/edit$/, COMPILE)
    const id = new URL(page.url()).pathname.split('/').at(-2)
    const { data: project } = await getJson<ApiOne<ApiProject>>(api, `projects/id/${id}`)

    await expect(page.getByRole('heading', { level: 1, name: 'Edit Apartment', exact: true })).toBeVisible()
    // The page header renders its description twice (phone and desktop layouts); one copy is hidden.
    await expect(page.getByText(`Update details for ${project.name}.`).filter({ visible: true })).toBeVisible()
    await expect(page.getByLabel('Apartment Name')).toHaveValue(project.name)
    await expect(page.getByLabel('Location', { exact: true })).toHaveValue(project.location ?? '')
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue(project.status.toLowerCase())
    await expect(page.getByLabel('Developer')).toHaveValue(project.developerName ?? '')
    await expect(page.getByRole('button', { name: 'Update Apartment', exact: true })).toBeEnabled()
    await expect(linkOrButton(page, 'Back to Apartments')).toHaveAttribute('href', '/admin/projects')
  })
})
