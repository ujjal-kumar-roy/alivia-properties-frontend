import type { Page } from "@playwright/test"
import { expect, test } from "./fixtures"
import { COMPILE, MISSING_ID, getJson, hydrated, open } from "./helpers"

// Admin content pages: marketplace quotes, suppliers, taxonomy, the product form, blog and the
// hero carousel. All of it is VIEW ONLY (this runs against the owner's real data): the tests read,
// filter, open dialogs and forms, and leave again. Controls that write (Save, Publish, Hide, Delete,
// Move, and the price and status editors of the supplier catalogue) are never touched, and the
// fixtures fail (and block) any write request the browser sends.
//
// Most of these pages load their data in the Next server, which turns an API error into an empty
// list that the browser never sees. So each test reads the same data from the API as the admin
// (`apiAs`) and checks that the page shows it, instead of only checking that nothing errored.

test.use({ viewport: { width: 1440, height: 900 } })

// ── Shapes of the API answers these tests read ───────────────────────────────

type Paged<T> = { data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }
type Wrapped<T> = { data: T }

/** Quote status → the label its badge and filter chip show. */
const QUOTE_STATUS_LABEL = {
  NEW: "New",
  ASSIGNED: "Assigned",
  CONTACTED: "Contacted",
  NEGOTIATING: "Negotiating",
  QUOTE_SENT: "Quote sent",
  WON: "Won",
  LOST: "Lost",
  CLOSED: "Closed",
} as const
type QuoteStatus = keyof typeof QUOTE_STATUS_LABEL

type ApiQuote = {
  id: string
  name: string
  email: string
  phone: string
  message: string
  status: QuoteStatus
  variantName?: string | null
  categorySlug?: string | null
  product?: { name: string; slug: string } | null
  supplier?: { name: string; slug: string } | null
  assignedRep?: { name: string } | null
  conversation?: { body: string }[]
}
type ApiSupplier = { id: string; slug: string; name: string; categories: string[] }
type ApiProduct = {
  id: string
  name: string
  brand?: string | null
  unit: string
  categorySlug: string
  supplier?: { name: string } | null
}
type ApiCategory = {
  slug: string
  name: string
  level?: "DEPARTMENT" | "CATEGORY" | "SUBCATEGORY"
  parentSlug?: string | null
}
type ApiPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  content?: string
  category: string
  isPublished: boolean
}
type ApiSlide = { id: string; title: string; isActive: boolean }

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Opens an admin page and waits for its heading, which is in the server-rendered HTML. */
async function openPage(page: Page, path: string, heading: string) {
  await open(page, path)
  await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible(COMPILE)
}

/** The pager's "Showing 1-3 of 3" line. The phone layout has its own copy, hidden at this width. */
const pagerSummary = (page: Page) => page.getByText(/^Showing \d+-\d+ of \d+$/).filter({ visible: true })

/** Table rows that carry a given action button, which leaves out the header row. */
const rowsWithButton = (page: Page, name: string) =>
  page.getByRole("row").filter({ has: page.getByRole("button", { name, exact: true }) })

/** What the "Request" column and the detail page call a quote. */
const quoteSubject = (quote: ApiQuote) =>
  quote.product?.name ?? quote.supplier?.name ?? quote.categorySlug ?? "General quote"

/** Where a quote's "Open related page" button leads. */
const relatedPage = (quote: ApiQuote) =>
  quote.product
    ? `/marketplace/product/${quote.product.slug}`
    : quote.supplier
      ? `/marketplace/supplier/${quote.supplier.slug}`
      : quote.categorySlug
        ? `/marketplace/category/${quote.categorySlug}`
        : "/marketplace"

// ═════════════════════════════════════════════════════════════════════════════
// Marketplace quotes
// ═════════════════════════════════════════════════════════════════════════════

test.describe("marketplace quotes", () => {
  const QUOTES = "/admin/marketplace-quotes"
  const quoteRows = (page: Page) => rowsWithButton(page, "Review")

  test("lists the quote requests with customer, request, supplier, status and a review button", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: quotes, meta } = await getJson<Paged<ApiQuote>>(admin, "marketplace/quotes?page=1&limit=10")
    expect(quotes.length, "the dev database holds quote requests").toBeGreaterThan(0)

    await openPage(page, QUOTES, "Marketplace Quotes")
    for (const header of ["Customer", "Request", "Supplier", "Status", "Actions"]) {
      await expect(page.getByRole("columnheader", { name: header, exact: true })).toBeVisible()
    }

    const rows = quoteRows(page)
    await expect(rows).toHaveCount(quotes.length)
    for (const quote of quotes) {
      const row = rows
        .filter({ hasText: quote.email })
        .filter({ has: page.getByText(QUOTE_STATUS_LABEL[quote.status], { exact: true }) })
        .first()
      await expect(row, `a row for ${quote.email} with status ${quote.status}`).toBeVisible()
      await expect(row.getByText(quote.name, { exact: true })).toBeVisible()
      await expect(row).toContainText(quoteSubject(quote))
      await expect(row).toContainText(quote.assignedRep?.name ?? "Unassigned")
      if (quote.supplier) {
        await expect(row.getByRole("link", { name: quote.supplier.name })).toHaveAttribute(
          "href",
          `/marketplace/supplier/${quote.supplier.slug}`,
        )
      } else {
        await expect(row.getByText("Manual routing")).toBeVisible()
      }
    }
    await expect(pagerSummary(page)).toHaveText(`Showing 1-${Math.min(meta.limit, meta.total)} of ${meta.total}`)
  })

  test("filters the quote list by status and shows an empty state for a status with none", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const statuses = Object.keys(QUOTE_STATUS_LABEL) as QuoteStatus[]
    const totals = new Map<QuoteStatus, number>()
    for (const status of statuses) {
      const { meta } = await getJson<Paged<ApiQuote>>(admin, `marketplace/quotes?status=${status}&limit=1`)
      totals.set(status, meta.total)
    }
    const withQuotes = statuses.find((status) => (totals.get(status) ?? 0) > 0)
    const withoutQuotes = statuses.find((status) => totals.get(status) === 0)
    expect(withQuotes, "at least one quote request has a status").toBeDefined()

    await openPage(page, QUOTES, "Marketplace Quotes")
    const filters = page.getByRole("group", { name: "Status" })
    await hydrated(filters.getByRole("button", { name: "All", exact: true }))
    await expect(filters.getByRole("button", { name: "All", exact: true, pressed: true })).toBeVisible()
    for (const label of Object.values(QUOTE_STATUS_LABEL)) {
      await expect(filters.getByRole("button", { name: label, exact: true })).toBeVisible()
    }

    if (withQuotes) {
      const label = QUOTE_STATUS_LABEL[withQuotes]
      await filters.getByRole("button", { name: label, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`[?&]status=${withQuotes}(&|$)`), COMPILE)
      await expect(filters.getByRole("button", { name: label, exact: true, pressed: true })).toBeVisible()
      const expectedRows = Math.min(10, totals.get(withQuotes) ?? 0)
      await expect(quoteRows(page)).toHaveCount(expectedRows, COMPILE)
      // Every remaining row carries that status badge.
      await expect(quoteRows(page).filter({ has: page.getByText(label, { exact: true }) })).toHaveCount(expectedRows)
    }

    if (withoutQuotes) {
      const label = QUOTE_STATUS_LABEL[withoutQuotes]
      await filters.getByRole("button", { name: label, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`[?&]status=${withoutQuotes}(&|$)`), COMPILE)
      await expect(
        page.getByText("No marketplace quote requests match this filter.").filter({ visible: true }),
      ).toBeVisible(COMPILE)
      await expect(quoteRows(page)).toHaveCount(0)
    }

    await filters.getByRole("button", { name: "All", exact: true }).click()
    await expect(page).not.toHaveURL(/status=/, COMPILE)
    await expect(quoteRows(page).first()).toBeVisible(COMPILE)
  })

  test("opens a quote's detail page with the requirement, the customer and the response form", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: quotes } = await getJson<Paged<ApiQuote>>(admin, "marketplace/quotes?page=1&limit=10")
    expect(quotes.length, "the dev database holds quote requests").toBeGreaterThan(0)
    const { data: detail } = await getJson<Wrapped<ApiQuote>>(admin, `marketplace/quotes/${quotes[0].id}`)

    await openPage(page, QUOTES, "Marketplace Quotes")
    const openDetail = quoteRows(page).first().getByRole("button", { name: "Open quote detail" })
    await expect(openDetail).toHaveAttribute("href", `${QUOTES}/${detail.id}`)
    await openDetail.click()

    await expect(page).toHaveURL(`${QUOTES}/${detail.id}`, COMPILE)
    await expect(page.getByRole("heading", { level: 1, name: "Marketplace quote", exact: true })).toBeVisible(COMPILE)
    await expect(page.getByRole("link", { name: "Back to quotes" })).toHaveAttribute("href", QUOTES)

    // The record: its subject, status, customer and requirement.
    const subject = detail.variantName ?? quoteSubject(detail)
    await expect(page.getByRole("heading", { level: 1, name: subject, exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: subject, exact: true })).toBeVisible()
    const main = page.getByRole("main")
    await expect(main).toContainText(QUOTE_STATUS_LABEL[detail.status])
    await expect(main).toContainText(detail.name)
    await expect(page.getByRole("link", { name: detail.email })).toHaveAttribute("href", `mailto:${detail.email}`)
    await expect(page.getByRole("link", { name: detail.phone })).toHaveAttribute("href", `tel:${detail.phone}`)
    await expect(page.getByText("Requirement", { exact: true })).toBeVisible()
    await expect(main).toContainText(detail.message.slice(0, 80))
    await expect(page.getByText("Routed to", { exact: true })).toBeVisible()
    await expect(main).toContainText(detail.supplier?.name ?? "Marketplace team")
    await expect(page.getByRole("button", { name: "Open related page" })).toHaveAttribute("href", relatedPage(detail))

    // The conversation thread shows every note the API holds for this quote.
    if (detail.conversation && detail.conversation.length > 0) {
      await expect(page.getByText("Conversation thread", { exact: true })).toBeVisible()
      for (const entry of detail.conversation) {
        await expect(main).toContainText(entry.body.slice(0, 80))
      }
    }

    // The response form is there and holds the current status. It is never saved.
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(detail.status)
    await expect(page.getByLabel("Final quoted price")).toBeVisible()
    await expect(page.getByLabel("Reply", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Conversation note")).toBeVisible()
    await expect(page.getByRole("button", { name: "Save response" })).toBeEnabled()
  })

  test("opens the review dialog with the admin team to assign and closes it without saving", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: quotes } = await getJson<Paged<ApiQuote>>(admin, "marketplace/quotes?page=1&limit=10")
    expect(quotes.length, "the dev database holds quote requests").toBeGreaterThan(0)
    const quote = quotes[0]
    const { data: admins } = await getJson<Paged<{ id: string }>>(admin, "users?role=ADMIN&limit=100")

    await openPage(page, QUOTES, "Marketplace Quotes")
    const review = quoteRows(page).first().getByRole("button", { name: "Review", exact: true })
    await hydrated(review)
    await review.click()

    const dialog = page.getByRole("dialog", { name: "Review quote request" })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(quote.name)
    await expect(dialog).toContainText(quote.email)
    await expect(dialog).toContainText(quote.message.slice(0, 80))
    await expect(dialog.getByLabel("Status", { exact: true })).toHaveValue(quote.status)
    await expect(dialog.getByLabel("Final quoted price")).toBeVisible()
    await expect(dialog.getByLabel("Reply", { exact: true })).toBeVisible()
    await expect(dialog.getByLabel("Conversation note")).toBeVisible()
    // The admin team comes from a separate server-side call that falls back to nothing on an error.
    const assignee = dialog.getByLabel("Assigned rep")
    await expect(assignee).toBeVisible()
    await expect(assignee.getByRole("option")).toHaveCount(admins.length + 1)
    await expect(dialog.getByRole("button", { name: "Save reply" })).toBeEnabled()

    await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(dialog).toBeHidden()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Marketplace suppliers and services
// ═════════════════════════════════════════════════════════════════════════════

test.describe("marketplace suppliers and services", () => {
  const SUPPLIERS = "/admin/marketplace/suppliers"
  const SEARCH_PLACEHOLDER = "Search suppliers or products…"
  const EMPTY = "No suppliers match. Add one above."

  /** Opens the category picker and picks the first category that has suppliers. Returns its label and count. */
  async function pickCategoryWithSuppliers(page: Page) {
    const picker = page.getByRole("button", { name: "Filter by category" })
    await hydrated(picker)
    await picker.click()
    const withSuppliers = page.getByRole("option").filter({ hasText: /\([1-9]\d*\)$/ })
    await expect(withSuppliers.first()).toBeVisible()
    const label = (await withSuppliers.first().innerText()).trim()
    const count = Number(/\((\d+)\)$/.exec(label)?.[1])
    await withSuppliers.first().click()
    await expect(picker).toContainText(label)
    return { label, count }
  }

  test("shows the catalogue toolbar with a category picker that counts suppliers per category", async ({ page }) => {
    await openPage(page, SUPPLIERS, "Suppliers & Services")
    await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toBeVisible()
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Add supplier" })).toBeVisible()

    const picker = page.getByRole("button", { name: "Filter by category" })
    await hydrated(picker)
    await picker.click()
    const options = page.getByRole("option")
    await expect(options.first()).toBeVisible()
    // Every category shows how many suppliers it has: "Cement (3)".
    await expect(options.filter({ hasNotText: /\(\d+\)$/ })).toHaveCount(0)
    await expect(options.filter({ hasText: /\([1-9]\d*\)$/ }).first()).toBeVisible()
  })

  test("lists the suppliers of a category, each with its add-product button", async ({ page }) => {
    await openPage(page, SUPPLIERS, "Suppliers & Services")
    const { count } = await pickCategoryWithSuppliers(page)

    const addProduct = page.getByRole("button", { name: "Add product", exact: true })
    await expect(async () => {
      expect(await addProduct.count()).toBeGreaterThanOrEqual(count)
    }).toPass()
    await expect(addProduct.first()).toHaveAttribute(
      "href",
      /^\/admin\/marketplace\/products\/new\?supplierId=[0-9a-f]{24}/,
    )
    await expect(page.getByText(EMPTY)).toBeHidden()
  })

  test("narrows the suppliers with the search box and says so when nothing matches", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: suppliers } = await getJson<Paged<ApiSupplier>>(admin, "marketplace/admin/suppliers?limit=100")

    await openPage(page, SUPPLIERS, "Suppliers & Services")
    await pickCategoryWithSuppliers(page)
    const addProduct = page.getByRole("button", { name: "Add product", exact: true })
    await expect(addProduct.first()).toBeVisible()
    const before = await addProduct.count()

    // The first card's supplier, found through the id in its add-product link.
    const href = (await addProduct.first().getAttribute("href")) ?? ""
    const supplierId = /supplierId=([0-9a-f]{24})/.exec(href)?.[1]
    const supplier = suppliers.find((candidate) => candidate.id === supplierId)
    expect(supplier, `the supplier behind ${href}`).toBeDefined()

    const search = page.getByPlaceholder(SEARCH_PLACEHOLDER)
    await hydrated(search)
    await search.fill("zz-no-such-supplier-zz")
    await expect(page.getByText(EMPTY)).toBeVisible()
    await expect(addProduct).toHaveCount(0)

    await search.fill(supplier?.name ?? "")
    await expect(page.getByText(supplier?.name ?? "", { exact: true }).first()).toBeVisible()
    await expect(page.getByText(EMPTY)).toBeHidden()

    await search.fill("")
    await expect(addProduct).toHaveCount(before)
  })

  test("opens the add-product form for a supplier with that supplier already chosen", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: suppliers } = await getJson<Paged<ApiSupplier>>(admin, "marketplace/admin/suppliers?limit=100")

    await openPage(page, SUPPLIERS, "Suppliers & Services")
    await pickCategoryWithSuppliers(page)
    const addProduct = page.getByRole("button", { name: "Add product", exact: true }).first()
    await expect(addProduct).toBeVisible()
    const href = (await addProduct.getAttribute("href")) ?? ""
    const supplier = suppliers.find((candidate) => href.includes(`supplierId=${candidate.id}`))
    expect(supplier, `the supplier behind ${href}`).toBeDefined()

    await addProduct.click()
    await expect(page).toHaveURL(/\/admin\/marketplace\/products\/new\?supplierId=/, COMPILE)
    await expect(page.getByRole("heading", { level: 1, name: "Add product" })).toBeVisible(COMPILE)
    await expect(page.getByRole("button", { name: "Supplier", exact: true })).toContainText(supplier?.name ?? "")
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Marketplace taxonomy (the Categories page)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("marketplace taxonomy", () => {
  const CATEGORIES = "/admin/marketplace/categories"

  /** The number in one of the stat tiles ("Departments 5"). */
  async function stat(page: Page, label: string) {
    const tile = page.getByRole("main").getByText(label, { exact: true }).first().locator("xpath=..")
    await expect(tile).toContainText(/\d/)
    return Number((await tile.innerText()).replace(/\D+/g, ""))
  }

  test("shows the department and category tree with stats that match the API", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: categories } = await getJson<Wrapped<ApiCategory[]>>(admin, "marketplace/admin/categories")
    const departments = categories.filter((category) => category.level === "DEPARTMENT").length
    const leaves = categories.filter((category) => category.level === "CATEGORY").length
    expect(departments, "the taxonomy has departments").toBeGreaterThan(0)

    await openPage(page, CATEGORIES, "Taxonomy")
    await expect(page.getByText("No departments yet.")).toBeHidden()

    // One "add category" button per department row, one "edit" button per department and category row.
    const addCategory = page.getByRole("button", { name: "Add category", exact: true })
    const edit = page.getByRole("button", { name: "Edit", exact: true })
    await expect(addCategory).toHaveCount(departments)
    await expect(edit).toHaveCount(departments + leaves)

    expect(await stat(page, "Departments")).toBe(departments)
    expect(await stat(page, "Categories")).toBe(leaves)
    expect(await stat(page, "Category images")).toBeLessThanOrEqual(leaves)

    await expect(page.getByRole("button", { name: "Department", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Category", exact: true })).toBeVisible()
  })

  test("filters the tree by name and shows no rows when nothing matches", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: categories } = await getJson<Wrapped<ApiCategory[]>>(admin, "marketplace/admin/categories")
    const category = categories.find((candidate) => candidate.level === "CATEGORY")
    expect(category, "the taxonomy has a category").toBeDefined()
    // One Edit button per department and category row.
    const all = categories.filter((candidate) => candidate.level === "DEPARTMENT" || candidate.level === "CATEGORY").length

    await openPage(page, CATEGORIES, "Taxonomy")
    const edit = page.getByRole("button", { name: "Edit", exact: true })
    await expect(edit).toHaveCount(all)

    const filter = page.getByRole("textbox", { name: "Filter categories" })
    await hydrated(filter)
    await filter.fill(category?.name ?? "")
    await expect(page.getByRole("main").getByText(category?.name ?? "", { exact: true }).first()).toBeVisible()
    await expect.poll(() => edit.count(), { message: "Edit buttons left by the filter" }).toBeLessThan(all)
    await expect(edit.first()).toBeVisible()

    await filter.fill("zz-no-such-category-zz")
    await expect(edit).toHaveCount(0)

    await filter.fill("")
    await expect(edit).toHaveCount(all)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Product form (render only)
// ═════════════════════════════════════════════════════════════════════════════

test.describe("product form", () => {
  const NEW_PRODUCT = "/admin/marketplace/products/new"

  test("renders the five sections with their fields and defaults", async ({ page }) => {
    await openPage(page, NEW_PRODUCT, "Add product")
    for (const section of [
      "Basics",
      "Media",
      "Specifications & highlights",
      "Variants & pricing",
      "Commerce & publishing",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: section, exact: true })).toBeVisible()
    }

    await expect(page.getByRole("button", { name: "Supplier", exact: true })).toContainText("Select supplier")
    await expect(page.getByRole("button", { name: "Category", exact: true })).toContainText("Select category")
    for (const label of ["Product name", "Brand", "Indicative price (BDT)", "MOQ", "Badge"]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByLabel("Unit", { exact: true })).toHaveValue("unit")
    await expect(page.getByLabel("Lead time (days)")).toHaveValue("1")
    await expect(page.getByLabel("Short description")).toBeVisible()
    await expect(page.getByLabel("Description", { exact: true })).toBeVisible()
    await expect(page.getByText("Thumbnail (required)")).toBeVisible()

    await expect(page.getByRole("button", { name: "Add spec" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Add variant" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Add price tier" })).toBeVisible()
    await expect(page.getByRole("checkbox", { name: "Published (visible to buyers)" })).toBeChecked()
    await expect(page.getByRole("checkbox", { name: "Featured" })).not.toBeChecked()

    // The save bar is there. It is never pressed.
    await expect(page.getByRole("button", { name: "Save product" })).toBeVisible()
    await expect(page.getByText("No changes")).toBeVisible()
  })

  test("lists every supplier and every category in its pickers", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: suppliers } = await getJson<Paged<ApiSupplier>>(admin, "marketplace/admin/suppliers?limit=100")
    const { data: categories } = await getJson<Wrapped<ApiCategory[]>>(admin, "marketplace/admin/categories")
    expect(suppliers.length, "the dev database holds suppliers").toBeGreaterThan(0)
    expect(categories.length, "the dev database holds categories").toBeGreaterThan(0)

    await openPage(page, NEW_PRODUCT, "Add product")
    const options = page.getByRole("option")

    // The pickers are opened and closed again; nothing is chosen, so the form stays untouched.
    const supplierPicker = page.getByRole("button", { name: "Supplier", exact: true })
    await hydrated(supplierPicker)
    await supplierPicker.click()
    await expect(options).toHaveCount(suppliers.length)
    await page.getByRole("textbox", { name: "Search suppliers…" }).press("Escape")
    await expect(options).toHaveCount(0)

    await page.getByRole("button", { name: "Category", exact: true }).click()
    await expect(options).toHaveCount(categories.length)
    await page.getByRole("textbox", { name: "Search categories…" }).press("Escape")
    await expect(options).toHaveCount(0)

    await expect(page.getByText("No changes")).toBeVisible()
  })

  test("opens a product in the editor with its fields filled in", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: products } = await getJson<Paged<ApiProduct>>(admin, "marketplace/admin/products?limit=100")
    const { data: categories } = await getJson<Wrapped<ApiCategory[]>>(admin, "marketplace/admin/categories")
    expect(products.length, "the dev database holds products").toBeGreaterThan(0)
    const product = products[0]
    const category = categories.find((candidate) => candidate.slug === product.categorySlug)

    await openPage(page, `/admin/marketplace/products/${product.id}`, "Edit product")
    await expect(page.getByText(product.name, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByLabel("Product name", { exact: true })).toHaveValue(product.name)
    await expect(page.getByLabel("Brand", { exact: true })).toHaveValue(product.brand ?? "")
    await expect(page.getByLabel("Unit", { exact: true })).toHaveValue(product.unit)
    await expect(page.getByRole("button", { name: "Supplier", exact: true })).toContainText(product.supplier?.name ?? "")
    await expect(page.getByRole("button", { name: "Category", exact: true })).toContainText(
      category?.name ?? product.categorySlug,
    )

    // The save bar is there. It is never pressed.
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible()
    await expect(page.getByText("No changes")).toBeVisible()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Blog
// ═════════════════════════════════════════════════════════════════════════════

test.describe("blog", () => {
  const BLOG = "/admin/blog"
  const articleRows = (page: Page) => rowsWithButton(page, "Edit")

  test("lists the articles with title, category, status and an edit button", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: posts, meta } = await getJson<Paged<ApiPost>>(admin, "blog/admin?page=1&limit=10&status=all")
    expect(posts.length, "the dev database holds an article").toBeGreaterThan(0)

    await openPage(page, BLOG, "Blog")
    await expect(page.getByRole("link", { name: "New article" })).toHaveAttribute("href", `${BLOG}/create`)
    for (const header of ["Post", "Status", "Actions"]) {
      await expect(page.getByRole("columnheader", { name: header, exact: true })).toBeVisible()
    }

    const rows = articleRows(page)
    await expect(rows).toHaveCount(posts.length)
    for (const post of posts) {
      const row = rows.filter({ hasText: post.title }).first()
      await expect(row, `a row for "${post.title}"`).toBeVisible()
      await expect(row).toContainText(post.category)
      await expect(row.getByText(post.isPublished ? "Published" : "Draft", { exact: true })).toBeVisible()
      await expect(row.getByRole("button", { name: "Edit", exact: true })).toHaveAttribute(
        "href",
        `${BLOG}/${post.id}/edit`,
      )
    }
    await expect(pagerSummary(page)).toHaveText(`Showing 1-${Math.min(meta.limit, meta.total)} of ${meta.total}`)
  })

  test("filters the articles by Published and Draft", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const published = await getJson<Paged<ApiPost>>(admin, "blog/admin?limit=10&status=published")
    const drafts = await getJson<Paged<ApiPost>>(admin, "blog/admin?limit=10&status=draft")

    await openPage(page, BLOG, "Blog")
    const filters = page.getByRole("group", { name: "Status" })
    await hydrated(filters.getByRole("button", { name: "All", exact: true }))
    await expect(filters.getByRole("button", { name: "All", exact: true, pressed: true })).toBeVisible()

    await filters.getByRole("button", { name: "Published", exact: true }).click()
    await expect(page).toHaveURL(/[?&]status=published(&|$)/, COMPILE)
    await expect(articleRows(page)).toHaveCount(published.data.length, COMPILE)
    for (const post of published.data) {
      await expect(articleRows(page).filter({ hasText: post.title }).first()).toBeVisible()
    }

    await filters.getByRole("button", { name: "Draft", exact: true }).click()
    await expect(page).toHaveURL(/[?&]status=draft(&|$)/, COMPILE)
    await expect(articleRows(page)).toHaveCount(drafts.data.length, COMPILE)
    if (drafts.data.length === 0) {
      await expect(page.getByText("No blog posts found.").filter({ visible: true })).toBeVisible()
    }
  })

  test("opens an article in the editor with its fields filled in", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: posts } = await getJson<Paged<ApiPost>>(admin, "blog/admin?page=1&limit=10&status=all")
    expect(posts.length, "the dev database holds an article").toBeGreaterThan(0)
    const { data: post } = await getJson<Wrapped<ApiPost>>(admin, `blog/admin/${posts[0].id}`)

    await openPage(page, BLOG, "Blog")
    await articleRows(page).first().getByRole("button", { name: "Edit", exact: true }).click()

    await expect(page).toHaveURL(`${BLOG}/${post.id}/edit`, COMPILE)
    await expect(page.getByRole("heading", { level: 1, name: "Edit article" })).toBeVisible(COMPILE)
    await expect(page.getByRole("link", { name: "Back to blog" })).toHaveAttribute("href", BLOG)
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(post.title)
    await expect(page.getByLabel("Slug", { exact: true })).toHaveValue(post.slug)
    await expect(page.getByLabel("Excerpt", { exact: true })).toHaveValue(post.excerpt)
    await expect(page.getByLabel("Content", { exact: true })).toHaveValue(post.content ?? "")
    await expect(page.getByLabel("Category", { exact: true })).toHaveValue(post.category)
    if (post.isPublished) {
      await expect(page.getByLabel("Published", { exact: true })).toBeChecked()
    } else {
      await expect(page.getByLabel("Published", { exact: true })).not.toBeChecked()
    }
    // The save buttons are there. They are never pressed.
    await expect(page.getByRole("button", { name: "Save draft" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeVisible()
  })

  test("renders the new-article form and fills the slug in from the title", async ({ page }) => {
    await openPage(page, `${BLOG}/create`, "Create article")
    await expect(page.getByRole("link", { name: "Back to blog" })).toHaveAttribute("href", BLOG)
    for (const label of ["Title", "Slug", "Excerpt", "Content", "Published at"]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByLabel("Published", { exact: true })).not.toBeChecked()

    // Article details start filled with the editorial defaults.
    for (const label of ["Category", "Author", "Author avatar URL", "Cover image URL", "Tags"]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByLabel("Author", { exact: true })).toHaveValue("Alivia Editorial Team")
    await expect(page.getByLabel("Read minutes")).toHaveValue("5")

    // Typing a title proposes the slug; nothing is saved.
    const title = page.getByLabel("Title", { exact: true })
    await hydrated(title)
    await title.fill("Dhaka Market Outlook 2027")
    await expect(page.getByLabel("Slug", { exact: true })).toHaveValue("dhaka-market-outlook-2027")

    await expect(page.getByRole("button", { name: "Save draft" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeVisible()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Hero carousel
// ═════════════════════════════════════════════════════════════════════════════

test.describe("hero carousel", () => {
  const HERO = "/admin/hero-slides"

  test("lists every slide with its visibility and position, or says there are none", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: slides } = await getJson<Wrapped<ApiSlide[]>>(admin, "hero-slides/admin")

    await openPage(page, HERO, "Hero Carousel")
    await expect(page.getByRole("link", { name: "Add slide" })).toHaveAttribute("href", `${HERO}/create`)

    if (slides.length === 0) {
      await expect(page.getByRole("heading", { name: "No hero slides yet" })).toBeVisible()
      await expect(page.getByText(/until then the marketplace hero shows the built-in default slides/)).toBeVisible()
      return
    }

    const items = page.getByRole("main").getByRole("listitem")
    await expect(items).toHaveCount(slides.length)
    for (const [index, slide] of slides.entries()) {
      const item = items.nth(index)
      await expect(item.getByText(slide.title, { exact: true })).toBeVisible()
      await expect(item.getByText(slide.isActive ? "Visible" : "Hidden", { exact: true })).toBeVisible()
      await expect(item.getByText(`Position ${index + 1}`, { exact: true })).toBeVisible()
      await expect(item.getByRole("button", { name: `Edit "${slide.title}"` })).toHaveAttribute(
        "href",
        `${HERO}/${slide.id}/edit`,
      )
      // The write controls are shown, never pressed.
      await expect(item.getByRole("button", { name: slide.isActive ? "Hide" : "Show", exact: true })).toBeVisible()
      await expect(item.getByRole("button", { name: `Delete "${slide.title}"` })).toBeVisible()
      const up = item.getByRole("button", { name: `Move "${slide.title}" up` })
      const down = item.getByRole("button", { name: `Move "${slide.title}" down` })
      if (index === 0) await expect(up).toBeDisabled()
      else await expect(up).toBeEnabled()
      if (index === slides.length - 1) await expect(down).toBeDisabled()
      else await expect(down).toBeEnabled()
    }
  })

  test("opens a slide in the editor with its fields filled in", async ({ page, apiAs }) => {
    const admin = await apiAs("admin")
    const { data: slides } = await getJson<Wrapped<ApiSlide[]>>(admin, "hero-slides/admin")
    test.skip(slides.length === 0, "the dev database has no hero slides to open")
    const slide = slides[0]

    await openPage(page, HERO, "Hero Carousel")
    await page.getByRole("button", { name: `Edit "${slide.title}"` }).click()

    await expect(page).toHaveURL(`${HERO}/${slide.id}/edit`, COMPILE)
    await expect(page.getByRole("heading", { level: 1, name: "Edit slide" })).toBeVisible(COMPILE)
    await expect(page.getByText(`Update "${slide.title}".`).filter({ visible: true })).toBeVisible()
    await expect(page.getByLabel("Title", { exact: true })).toHaveValue(slide.title)
    await expect(page.getByRole("button", { name: "Update slide" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Back to Hero Carousel" })).toHaveAttribute("href", HERO)
  })

  test("renders the new-slide form and previews the title as it is typed", async ({ page }) => {
    await openPage(page, `${HERO}/create`, "Add slide")
    await expect(page.getByRole("button", { name: "Back to Hero Carousel" })).toHaveAttribute("href", HERO)
    for (const label of [
      "Eyebrow",
      "Title",
      "Subtitle",
      "Primary button label",
      "Primary button link",
      "Secondary button label",
      "Secondary button link",
      "Order",
    ]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByLabel("Eyebrow icon")).toHaveValue("Sparkles")
    await expect(page.getByRole("checkbox", { name: "Show this slide on the marketplace hero" })).toBeChecked()

    // The live preview follows the form; nothing is saved.
    const placeholder = page.getByRole("heading", { level: 3, name: "Slide title appears here" })
    await expect(placeholder).toBeVisible()
    const title = page.getByLabel("Title", { exact: true })
    await hydrated(title)
    await title.fill("Own a home in Bangladesh")
    await expect(page.getByRole("heading", { level: 3, name: "Own a home in Bangladesh" })).toBeVisible()
    await expect(placeholder).toBeHidden()

    await expect(page.getByRole("button", { name: "Create slide" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeVisible()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Moving around, and records that are gone
// ═════════════════════════════════════════════════════════════════════════════

test("moves between the content pages from the sidebar", async ({ page }) => {
  await openPage(page, "/admin/blog", "Blog")
  const sidebar = page.getByRole("complementary", { name: "Admin Workspace navigation" })

  for (const { link, heading, path } of [
    { link: "Marketplace Quotes", heading: "Marketplace Quotes", path: "/admin/marketplace-quotes" },
    { link: "Suppliers & Services", heading: "Suppliers & Services", path: "/admin/marketplace/suppliers" },
    { link: "Categories", heading: "Taxonomy", path: "/admin/marketplace/categories" },
    { link: "Hero Carousel", heading: "Hero Carousel", path: "/admin/hero-slides" },
    { link: "Blog", heading: "Blog", path: "/admin/blog" },
  ]) {
    const item = sidebar.getByRole("link", { name: link, exact: true })
    await item.click()
    await expect(page).toHaveURL(path, COMPILE)
    await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible(COMPILE)
    await expect(item).toHaveAttribute("aria-current", "page")
  }
})

test.describe("a record that does not exist", () => {
  for (const { record, path } of [
    { record: "quote", path: `/admin/marketplace-quotes/${MISSING_ID}` },
    { record: "article", path: `/admin/blog/${MISSING_ID}/edit` },
    { record: "hero slide", path: `/admin/hero-slides/${MISSING_ID}/edit` },
    { record: "product", path: `/admin/marketplace/products/${MISSING_ID}` },
  ]) {
    test.describe(record, () => {
      // Next may answer the page itself with a 404, and that is the point of these tests.
      test.use({ allowedErrors: [new RegExp(`${path} -> 404`)] })

      test(`shows the not-found page for a missing ${record}`, async ({ page }) => {
        await open(page, path)
        await expect(page.getByText("This page could not be found.")).toBeVisible(COMPILE)
      })
    })
  }
})
