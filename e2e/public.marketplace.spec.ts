import type { Page } from "@playwright/test"
import { expect, test, type ApiClient } from "./fixtures"
import { KNOWN_BUG, escapeRegExp, getJson, hydrated, open } from "./helpers"

/*
 * The public marketplace, signed out: home, category listing (products and sellers), supplier page,
 * product page and the quote pages.
 *
 * Data safety: nothing here writes to the database. The quote forms and the request wizard are only
 * rendered or walked up to the seller step, never submitted. The one interaction that changes
 * anything is "Add to quote list", which writes the visitor's own localStorage (the test's throwaway
 * browser context) and sends nothing to the server.
 *
 * Expected names, totals and slugs come from anonymous GETs to the API wherever the page should show
 * them, so the checks follow the owner's data instead of hard-coding it. A server page that quietly
 * fell back to an empty state (they swallow API errors) then fails on the missing data.
 */

// The pages the area is specified against.
const CATEGORY_SLUG = "cement"
const CATEGORY_PATH = `/marketplace/category/${CATEGORY_SLUG}`
const SUPPLIER_SLUG = "berger-paints-bd"
const PRODUCT_SLUG = "plumbing-services"

const SELLER_TYPES = [
  { label: "Material sellers", kind: "SUPPLIER" },
  { label: "Service providers", kind: "SERVICE" },
] as const

// ─── API reads (anonymous, read-only) ─────────────────────────────────────────

type Envelope<T> = { data: T; meta?: { total: number } }
type Named = { slug: string; name: string }
type TreeDepartment = Named & { categories: Named[] }
type ProductRecord = Named & {
  categorySlug: string
  category?: Named
  supplier?: Named & { kind?: string }
}
type SupplierRecord = Named & {
  rating: number
  reviewCount: number
  location: string
  priceRange?: string
  videoUrl?: string
  products?: ProductRecord[]
}

const apiCache = new Map<string, Promise<Envelope<unknown>>>()

/** GET `path` from the API. A repeated path is fetched once per worker, so the spec adds few reads next to the app's own server-side ones. */
function apiGet<T>(request: ApiClient, path: string): Promise<Envelope<T>> {
  let pending = apiCache.get(path)
  if (!pending) {
    pending = getJson<Envelope<unknown>>(request, path)
    apiCache.set(path, pending)
    pending.catch(() => apiCache.delete(path))
  }
  return pending as Promise<Envelope<T>>
}

async function totalOf(request: ApiClient, path: string): Promise<number> {
  const { meta } = await apiGet<unknown[]>(request, path)
  return meta?.total ?? 0
}

async function departmentsWithCategories(request: ApiClient): Promise<TreeDepartment[]> {
  const { data } = await apiGet<TreeDepartment[]>(request, "marketplace/tree")
  const departments = data.filter((department) => department.categories.length > 0)
  expect(departments.length, "the catalogue has departments with categories").toBeGreaterThan(0)
  return departments
}

/** The category the listing tests run on, with the department it sits in. */
async function categoryUnderTest(request: ApiClient) {
  const { data } = await apiGet<TreeDepartment[]>(request, "marketplace/tree")
  const department = data.find((candidate) => candidate.categories.some(({ slug }) => slug === CATEGORY_SLUG))
  const category = department?.categories.find(({ slug }) => slug === CATEGORY_SLUG)
  if (!department || !category) {
    throw new Error(`The catalogue has no "${CATEGORY_SLUG}" category any more: point CATEGORY_SLUG at one with products.`)
  }
  return { department, category }
}

// ─── Page helpers ─────────────────────────────────────────────────────────────

/** The server HTML is interactive only after React hydrates the page's main landmark. */
const pageHydrated = (page: Page) => hydrated(page.getByRole("main"))

/** The category toolbar is ready: the server renders the phone's sheet button, and a desktop swaps in the sort menu once hydrated. */
async function toolbarReady(page: Page) {
  await expect(page.getByRole("button", { name: "Sort", exact: true })).toHaveAttribute("aria-haspopup", "menu", {
    timeout: 45_000,
  })
}

/** The result cards of a category or supplier page, whether shown as a grid or as list rows. */
const cards = (page: Page) => page.getByRole("main").getByRole("article")
const cardNames = (page: Page) => cards(page).getByRole("heading", { level: 3 }).allInnerTexts()
const listingType = (page: Page) => page.getByRole("navigation", { name: "Listing type" })
const tile = (page: Page, slug: string) => page.locator(`main a[href="/marketplace/category/${slug}"]`).first()

/** The list behind the toolbar is filled: not empty, and not the "could not load" state. */
async function expectListed(page: Page, noun: "products" | "sellers") {
  await expect(
    page.getByRole("heading", { level: 2, name: /^Could not load/ }),
    `the ${noun} list fell back to its API-error state`,
  ).toHaveCount(0)
  await expect(
    page.getByRole("heading", { level: 2, name: new RegExp(`^(No ${noun} |Nothing listed)`) }),
    `the ${noun} list is empty`,
  ).toHaveCount(0)
  await expect(cards(page).first(), `no ${noun} are listed`).toBeVisible()
}

/** The slug of each result card, read from the link on its name (product or supplier address). */
const cardSlugs = (page: Page) =>
  cards(page)
    .getByRole("heading", { level: 3 })
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => (link.getAttribute("href") ?? "").split("/").pop() ?? ""))

/** The cards come in the order the API gives for the same sort (ties included), so the page passes the sort on and keeps its order. */
async function expectApiOrder(page: Page, request: ApiClient, path: string) {
  const { data } = await apiGet<Named[]>(request, path)
  expect(await cardSlugs(page), `card order vs GET ${path}`).toEqual(data.map(({ slug }) => slug))
}

/**
 * The price request ignores a tap in the first 300 ms of each screen (a double-tap guard), which a
 * test clicks within. So the button is pressed again until the next screen is there.
 */
async function continueTo(page: Page, heading: string) {
  const next = page.getByRole("heading", { level: 2, name: heading })
  await expect(async () => {
    if (!(await next.isVisible())) await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 5_000 })
    await expect(next).toBeVisible({ timeout: 2_000 })
  }).toPass()
}

async function chooseSort(page: Page, label: string) {
  await page.getByRole("button", { name: "Sort", exact: true }).click()
  await page.getByRole("menuitemradio", { name: label }).click()
}

async function expectSortChecked(page: Page, label: string) {
  await page.getByRole("button", { name: "Sort", exact: true }).click()
  await expect(page.getByRole("menuitemradio", { name: label })).toBeChecked()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("menu", { name: "Sort" })).toBeHidden()
}

async function applySellerType(page: Page, label: string) {
  await page.getByRole("button", { name: /^Filters/ }).click()
  const dialog = page.getByRole("dialog", { name: "Filters" })
  await dialog.getByRole("radio", { name: label }).click()
  await dialog.getByRole("button", { name: /^Show/ }).click()
}

/** "৳1,57,300" → 157300; null for an "Ask for price" card. */
function takaOf(text: string): number | null {
  const match = text.match(/৳\s*([\d,]+(?:\.\d+)?)/)
  return match ? Number(match[1].replace(/,/g, "")) : null
}

/** The cards that show a price must be in price order. With fewer than two priced cards there is nothing to compare. */
async function expectPriceOrder(page: Page, direction: "asc" | "desc") {
  const texts = await cards(page).allInnerTexts()
  const prices = texts.map(takaOf).filter((price): price is number => price !== null)
  if (prices.length < 2) {
    test.info().annotations.push({
      type: "price order not checked",
      description: `only ${prices.length} of ${texts.length} cards show a price (the rest read "Ask for price")`,
    })
    return
  }
  const expected = [...prices].sort((a, b) => (direction === "asc" ? a - b : b - a))
  expect(prices, `card prices, sorted ${direction}`).toEqual(expected)
}

function expectAlphabetical(names: string[], what: string) {
  const lower = names.map((name) => name.toLowerCase())
  expect(lower, `${what} listed A to Z`).toEqual([...lower].sort())
}

// ─── Home ─────────────────────────────────────────────────────────────────────

test.describe("marketplace home", () => {
  test("lists the departments with their category tiles and quick links", async ({ page, request }) => {
    const departments = await departmentsWithCategories(request)

    await open(page, "/marketplace")

    await expect(page).toHaveTitle(/^Marketplace - Alivia Properties/)
    await expect(page.getByRole("heading", { level: 2, name: "Build by Category" })).toBeVisible()
    const quickLinks = page.getByRole("navigation", { name: "Marketplace departments" })
    await expect(quickLinks.getByRole("link", { name: "Browse all apartments" })).toHaveAttribute("href", "/apartments")
    for (const department of departments) {
      await expect(page.getByRole("heading", { level: 3, name: department.name, exact: true })).toBeVisible()
      await expect(tile(page, department.categories[0].slug)).toBeVisible()
      await expect(quickLinks.getByRole("link", { name: department.name, exact: true })).toHaveAttribute(
        "href",
        `#department-${department.slug}`,
      )
    }
  })

  test("shows the live seller count and the flagship apartment projects", async ({ page, request }) => {
    const sellers = await totalOf(request, "marketplace/suppliers?limit=1")
    const { data: projects } = await apiGet<Named[]>(request, "projects?limit=3")
    expect(sellers, "the marketplace has sellers").toBeGreaterThan(0)
    expect(projects.length, "there are projects to feature").toBeGreaterThan(0)

    await open(page, "/marketplace")

    await expect(page.getByText(new RegExp(`${sellers.toLocaleString("en-BD")} verified sellers`)).first()).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Find your next landmark." })).toBeVisible()
    for (const project of projects) {
      await expect(page.getByRole("heading", { level: 3, name: project.name, exact: true }).first()).toBeVisible()
    }
  })

  test("opens a category from its tile", async ({ page, request }) => {
    const [department] = await departmentsWithCategories(request)
    const category = department.categories[0]

    await open(page, "/marketplace")
    await tile(page, category.slug).click()

    await expect(page).toHaveURL(`/marketplace/category/${category.slug}`)
    await expect(page.getByRole("heading", { level: 1, name: category.name, exact: true })).toBeVisible()
  })

  test("finds a category from the search box", async ({ page, request }) => {
    const [department] = await departmentsWithCategories(request)
    const category = department.categories[0]

    await open(page, "/marketplace")
    await hydrated(page.getByRole("button", { name: "Search marketplace" }))
    await page.getByRole("searchbox", { name: "Search marketplace categories" }).fill(category.name)
    await page.getByRole("button", { name: "Search marketplace" }).click()

    await expect(page).toHaveURL(/[?&]search=/)
    await expect(page.getByRole("heading", { level: 2, name: `Results for “${category.name}”` })).toBeVisible()
    await expect(tile(page, category.slug)).toBeVisible()
    await expect(page.getByRole("link", { name: "Clear filters" }).first()).toBeVisible()
  })

  test("says so when no category matches the search, and clears it", async ({ page }) => {
    await open(page, "/marketplace")
    await hydrated(page.getByRole("button", { name: "Search marketplace" }))
    await page.getByRole("searchbox", { name: "Search marketplace categories" }).fill("zzqxv-no-such-category")
    await page.getByRole("button", { name: "Search marketplace" }).click()

    await expect(page.getByText("No category match yet.")).toBeVisible()

    await page.getByRole("link", { name: "Clear filters" }).first().click()

    await expect(page).toHaveURL("/marketplace")
    await expect(page.getByRole("heading", { level: 2, name: "Build by Category" })).toBeVisible()
  })

  test("narrows the tiles to the chosen department", async ({ page, request }) => {
    const departments = await departmentsWithCategories(request)
    test.skip(departments.length < 2, "needs two departments with categories")
    const [other, chosen] = departments

    await open(page, "/marketplace")
    await hydrated(page.getByRole("button", { name: "Search marketplace" }))
    await page
      .getByRole("region", { name: "Marketplace search and account" })
      .getByRole("combobox")
      .selectOption({ label: chosen.name })
    await page.getByRole("button", { name: "Search marketplace" }).click()

    await expect(page).toHaveURL(new RegExp(`[?&]department=${chosen.slug}(&|$)`))
    await expect(page.getByRole("heading", { level: 2, name: "Search results" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 3, name: chosen.name, exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { level: 3, name: other.name, exact: true })).toHaveCount(0)
  })

  test("guided start takes a materials shopper to a department", async ({ page, request }) => {
    const [department] = (await apiGet<TreeDepartment[]>(request, "marketplace/tree")).data

    await open(page, "/marketplace")
    await pageHydrated(page)
    const guide = page.getByRole("region", { name: "Find what you need" })
    await guide.getByRole("button", { name: "Source building materials" }).click()
    await guide.getByRole("button", { name: department.name, exact: true }).click()
    await guide.getByRole("link", { name: "Browse materials" }).click()

    await expect(page).toHaveURL(`/marketplace/category/${department.slug}`)
    await expect(page.getByRole("heading", { level: 1, name: department.name, exact: true })).toBeVisible()
  })

  test("opens the All Categories menu when pointed at and switches department", async ({ page, request }) => {
    const departments = await departmentsWithCategories(request)
    const department = departments[departments.length - 1]
    const category = department.categories[0]

    await open(page, "/marketplace")
    await pageHydrated(page)
    await page.getByRole("button", { name: "All categories" }).hover()

    const menu = page.getByRole("menu", { name: "Marketplace categories" })
    await expect(menu).toBeVisible()
    await menu.getByRole("menuitem", { name: department.name, exact: true }).hover()
    await expect(menu.getByRole("heading", { level: 3, name: department.name, exact: true })).toBeVisible()
    await menu.getByRole("link", { name: category.name, exact: true }).click()

    await expect(page).toHaveURL(`/marketplace/category/${category.slug}`)
  })

  test("opens the All Categories menu from the keyboard and closes it with Escape", async ({ page }) => {
    await open(page, "/marketplace")
    await pageHydrated(page)
    const trigger = page.getByRole("button", { name: "All categories" })

    await trigger.focus()
    await page.keyboard.press("Enter")

    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(page.getByRole("menu", { name: "Marketplace categories" })).toBeVisible()

    await page.keyboard.press("Escape")

    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(page.getByRole("menu", { name: "Marketplace categories" })).toBeHidden()
  })

  test.describe("on a tablet-width touch screen", () => {
    test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true })

    // From 768 px wide the menu opens on mouseenter and the button's click handler toggles it; a tap
    // sends both, so the menu opens and shuts again at once.
    test("opens the All Categories menu with a tap", { tag: "@known-bug" }, async ({ page }) => {
      test.fail(true, KNOWN_BUG.megaMenuTap)
      await open(page, "/marketplace")
      await pageHydrated(page)
      const trigger = page.getByRole("button", { name: "All categories" })

      await trigger.tap()

      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      await expect(page.getByRole("menu", { name: "Marketplace categories" })).toBeVisible()
    })
  })
})

// ─── Category page: products ──────────────────────────────────────────────────

test.describe("category page: products", () => {
  test("shows the category with its breadcrumb, totals and product cards", async ({ page, request }) => {
    const { department, category } = await categoryUnderTest(request)
    const products = await totalOf(request, `marketplace/products?category=${CATEGORY_SLUG}&limit=1`)
    const sellers = await totalOf(request, `marketplace/suppliers?category=${CATEGORY_SLUG}&limit=1`)
    const metaLine = [
      products > 0 ? `${products} ${products === 1 ? "product" : "products"}` : null,
      sellers > 0 ? `${sellers} ${sellers === 1 ? "seller" : "sellers"}` : null,
    ]
      .filter(Boolean)
      .join(" · ")

    await open(page, CATEGORY_PATH)

    await expect(page).toHaveTitle(new RegExp(`^${escapeRegExp(category.name)} - Alivia Marketplace`))
    await expect(page.getByRole("heading", { level: 1, name: category.name, exact: true })).toBeVisible()
    await expect(page.getByText(metaLine, { exact: true })).toBeVisible()
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(breadcrumb.getByRole("link", { name: "Marketplace", exact: true })).toHaveAttribute("href", "/marketplace")
    await expect(breadcrumb.getByRole("link", { name: department.name, exact: true })).toHaveAttribute(
      "href",
      `/marketplace/category/${department.slug}`,
    )
    await expect(breadcrumb.getByText(category.name, { exact: true })).toBeVisible()
    await expect(listingType(page).getByRole("link", { name: `Products ${products}`, exact: true })).toBeVisible()
    await expect(listingType(page).getByRole("link", { name: `Sellers ${sellers}`, exact: true })).toBeVisible()

    await expectListed(page, "products")
    const first = cards(page).first()
    await expect(first.getByRole("heading", { level: 3 }).getByRole("link")).toHaveAttribute("href", /^\/marketplace\/product\/./)
    await expect(first).toContainText(/৳|Ask for price/)
    await expect(first.getByRole("button", { name: /^Add .+ to quote list$/ })).toBeVisible()
  })

  const PRODUCT_SORTS = [
    { label: "Newest", param: undefined, api: "createdAt:desc" },
    { label: "Price: low to high", param: "price-asc", api: "price:asc" },
    { label: "Price: high to low", param: "price-desc", api: "price:desc" },
    { label: "Name: A to Z", param: "name", api: "name:asc" },
  ] as const

  for (const { label, param, api } of PRODUCT_SORTS) {
    test(`keeps the product grid filled when sorted by ${label}`, async ({ page, request }) => {
      // Newest is the default, so start from another order to make choosing it a real change.
      await open(page, param ? CATEGORY_PATH : `${CATEGORY_PATH}?sort=name`)
      await toolbarReady(page)

      await chooseSort(page, label)

      if (param) await expect(page).toHaveURL(new RegExp(`[?&]sort=${param}(&|$)`))
      else await expect(page).not.toHaveURL(/[?&]sort=/)
      await expectListed(page, "products")
      await expectApiOrder(page, request, `marketplace/products?category=${CATEGORY_SLUG}&limit=24&sort=${api}`)
      if (param === "name") expectAlphabetical(await cardNames(page), "product names")
      if (param === "price-asc") await expectPriceOrder(page, "asc")
      if (param === "price-desc") await expectPriceOrder(page, "desc")
      await expectSortChecked(page, label)
    })
  }

  test("switches between the grid and the list layout and remembers it", async ({ page }) => {
    await open(page, CATEGORY_PATH)
    await toolbarReady(page)
    const gridNames = await cardNames(page)
    await expect(page.getByRole("button", { name: "Grid view" })).toHaveAttribute("aria-pressed", "true")

    await page.getByRole("button", { name: "List view" }).click()

    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("button", { name: "Grid view" })).toHaveAttribute("aria-pressed", "false")
    await expect(cards(page).first()).toBeVisible()
    expect(await cardNames(page), "the same products appear as rows").toEqual(gridNames)

    await page.reload()
    await toolbarReady(page)

    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true")
  })

  for (const { label, kind } of SELLER_TYPES) {
    test(`filters the products by ${label}, or says none match`, async ({ page, request }) => {
      const expected = await totalOf(request, `marketplace/products?category=${CATEGORY_SLUG}&kind=${kind}&limit=1`)
      await open(page, CATEGORY_PATH)
      await toolbarReady(page)

      await applySellerType(page, label)

      await expect(page).toHaveURL(new RegExp(`[?&]kind=${kind}(&|$)`))
      await expect(page.getByRole("button", { name: "Filters 1 active" })).toBeVisible()
      await expect(listingType(page).getByRole("link", { name: `Products ${expected}`, exact: true })).toBeVisible()
      if (expected > 0) {
        await expectListed(page, "products")
      } else {
        await expect(page.getByRole("heading", { level: 2, name: /^No products match/ })).toBeVisible()
        await expect(cards(page)).toHaveCount(0)
      }
    })
  }

  test("offers a way out of a filter that matches nothing", async ({ page, request }) => {
    let emptyKind: "SUPPLIER" | "SERVICE" | undefined
    for (const { kind } of SELLER_TYPES) {
      if ((await totalOf(request, `marketplace/products?category=${CATEGORY_SLUG}&kind=${kind}&limit=1`)) === 0) {
        emptyKind = kind
        break
      }
    }
    test.skip(!emptyKind, "this category has products from both seller types")

    await open(page, `${CATEGORY_PATH}?view=products&kind=${emptyKind}`)
    await toolbarReady(page)
    await expect(page.getByRole("heading", { level: 2, name: /^No products match/ })).toBeVisible()

    await page.getByRole("link", { name: "Clear filters" }).first().click()

    await expect(page).not.toHaveURL(/[?&]kind=/)
    await expectListed(page, "products")
  })

  test("narrows the products with the search box", async ({ page, request }) => {
    const { category } = await categoryUnderTest(request)
    const { data: all } = await apiGet<Named[]>(request, `marketplace/products?category=${CATEGORY_SLUG}&limit=24`)
    const word = all[0].name.split(/\s+/).find((part) => /^[A-Za-z0-9]{3,}$/.test(part)) ?? all[0].name
    const { data: matches } = await apiGet<Named[]>(request, `marketplace/products?category=${CATEGORY_SLUG}&limit=24&search=${word}`)
    expect(matches.map(({ slug }) => slug), "the search term finds the product it came from").toContain(all[0].slug)

    await open(page, CATEGORY_PATH)
    await toolbarReady(page)
    const search = page.getByRole("searchbox", { name: `Search ${category.name}` })
    await search.fill(word)
    await search.press("Enter")

    await expect(page).toHaveURL(new RegExp(`[?&]q=${word}(&|$)`))
    await expectListed(page, "products")
    expect((await cardSlugs(page)).sort(), "the cards are the products the API finds for the term").toEqual(
      matches.map(({ slug }) => slug).sort(),
    )
  })

  test("says so when the search matches nothing, and clears it", async ({ page, request }) => {
    const { category } = await categoryUnderTest(request)
    await open(page, CATEGORY_PATH)
    await toolbarReady(page)

    const search = page.getByRole("searchbox", { name: `Search ${category.name}` })
    await search.fill("zzqxv-no-such-product")
    await search.press("Enter")

    await expect(page.getByRole("heading", { level: 2, name: /^No products match/ })).toBeVisible()
    await expect(cards(page)).toHaveCount(0)

    await page.getByRole("button", { name: "Clear search" }).click()

    await expect(page).not.toHaveURL(/[?&]q=/)
    await expectListed(page, "products")
  })

  test("jumps to a sibling category from the chip row", async ({ page, request }) => {
    const { department } = await categoryUnderTest(request)
    const sibling = department.categories.find(({ slug }) => slug !== CATEGORY_SLUG)
    test.skip(!sibling, "the department has a single category")
    if (!sibling) return

    await open(page, CATEGORY_PATH)
    await page
      .getByRole("group", { name: `Categories in ${department.name}` })
      .getByRole("link", { name: sibling.name, exact: true })
      .click()

    await expect(page).toHaveURL(`/marketplace/category/${sibling.slug}`)
    await expect(page.getByRole("heading", { level: 1, name: sibling.name, exact: true })).toBeVisible()
  })

  test("lists a department's categories as tiles instead of products", async ({ page, request }) => {
    const [department] = await departmentsWithCategories(request)
    const category = department.categories[0]
    const count = department.categories.length

    await open(page, `/marketplace/category/${department.slug}`)

    await expect(page.getByRole("heading", { level: 1, name: department.name, exact: true })).toBeVisible()
    await expect(page.getByText(`${count} ${count === 1 ? "category" : "categories"}`, { exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: `Categories in ${department.name}` })).toBeVisible()
    await expect(page.getByRole("link", { name: `Browse ${category.name}`, exact: true }).first()).toHaveAttribute(
      "href",
      `/marketplace/category/${category.slug}`,
    )
    await expect(page.getByRole("button", { name: "Sort", exact: true })).toHaveCount(0)
  })
})

// ─── Category page: sellers ───────────────────────────────────────────────────

test.describe("category page: sellers", () => {
  test("switches to the sellers, who offer a profile and a quote", async ({ page, request }) => {
    const { category } = await categoryUnderTest(request)
    const sellers = await totalOf(request, `marketplace/suppliers?category=${CATEGORY_SLUG}&limit=1`)
    await open(page, CATEGORY_PATH)
    await toolbarReady(page)

    await listingType(page).getByRole("link", { name: /^Sellers/ }).click()

    await expect(page).toHaveURL(/[?&]view=suppliers/)
    await expect(page.getByRole("heading", { level: 2, name: `Sellers in ${category.name}` })).toBeVisible()
    await expect(listingType(page).getByRole("link", { name: `Sellers ${sellers}`, exact: true })).toBeVisible()
    await expectListed(page, "sellers")
    const first = cards(page).first()
    await expect(first.getByRole("heading", { level: 3 }).getByRole("link")).toHaveAttribute("href", /^\/marketplace\/supplier\/./)
    await expect(first.getByRole("link", { name: "View supplier" })).toBeVisible()
    await expect(first.getByRole("link", { name: "Request quote" })).toHaveAttribute(
      "href",
      new RegExp(`^/marketplace/quote\\?supplierSlug=.+&categorySlug=${CATEGORY_SLUG}$`),
    )
  })

  test("offers only the Newest and Name sorts for sellers", async ({ page }) => {
    await open(page, `${CATEGORY_PATH}?view=suppliers`)
    await toolbarReady(page)

    await page.getByRole("button", { name: "Sort", exact: true }).click()

    await expect(page.getByRole("menuitemradio")).toHaveText(["Newest", "Name: A to Z"])
  })

  const SELLER_SORTS = [
    { label: "Newest", param: undefined, api: "createdAt:desc" },
    { label: "Name: A to Z", param: "name", api: "name:asc" },
  ] as const

  for (const { label, param, api } of SELLER_SORTS) {
    test(`keeps the seller list filled when sorted by ${label}`, async ({ page, request }) => {
      await open(page, `${CATEGORY_PATH}?view=suppliers${param ? "" : "&sort=name"}`)
      await toolbarReady(page)

      await chooseSort(page, label)

      if (param) await expect(page).toHaveURL(new RegExp(`[?&]sort=${param}(&|$)`))
      else await expect(page).not.toHaveURL(/[?&]sort=/)
      await expect(page).toHaveURL(/[?&]view=suppliers/)
      await expectListed(page, "sellers")
      await expectApiOrder(page, request, `marketplace/suppliers?category=${CATEGORY_SLUG}&limit=24&sort=${api}`)
      if (param === "name") expectAlphabetical(await cardNames(page), "seller names")
      await expectSortChecked(page, label)
    })
  }

  test("filters the sellers by seller type, or says none match", async ({ page, request }) => {
    const expected = {
      SUPPLIER: await totalOf(request, `marketplace/suppliers?category=${CATEGORY_SLUG}&kind=SUPPLIER&limit=1`),
      SERVICE: await totalOf(request, `marketplace/suppliers?category=${CATEGORY_SLUG}&kind=SERVICE&limit=1`),
    }
    await open(page, `${CATEGORY_PATH}?view=suppliers`)
    await toolbarReady(page)

    for (const { label, kind } of SELLER_TYPES) {
      await test.step(label, async () => {
        await applySellerType(page, label)

        await expect(page).toHaveURL(new RegExp(`[?&]kind=${kind}(&|$)`))
        await expect(listingType(page).getByRole("link", { name: `Sellers ${expected[kind]}`, exact: true })).toBeVisible()
        if (expected[kind] > 0) {
          await expectListed(page, "sellers")
        } else {
          await expect(page.getByRole("heading", { level: 2, name: /^No sellers match/ })).toBeVisible()
          await expect(cards(page)).toHaveCount(0)
        }
      })
    }
  })
})

// ─── Supplier page ────────────────────────────────────────────────────────────

test.describe("supplier page", () => {
  test("shows the supplier profile and its products", async ({ page, request }) => {
    const { data: supplier } = await apiGet<SupplierRecord>(request, `marketplace/suppliers/${SUPPLIER_SLUG}`)
    const products = supplier.products ?? []

    await open(page, `/marketplace/supplier/${SUPPLIER_SLUG}`)

    await expect(page).toHaveTitle(new RegExp(`^${escapeRegExp(supplier.name)} - Alivia Marketplace`))
    await expect(page.getByRole("heading", { level: 1, name: supplier.name, exact: true })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByText(supplier.name, { exact: true })).toBeVisible()
    await expect(page.getByText(supplier.location).first()).toBeVisible()
    if (supplier.priceRange) await expect(page.getByText(supplier.priceRange).first()).toBeVisible()
    if (supplier.rating > 0) {
      await expect(page.getByText(supplier.rating.toFixed(1)).first()).toBeVisible()
      await expect(page.getByText(`${supplier.reviewCount} reviews`).first()).toBeVisible()
    }
    // The sample video is external and not asserted on: it is only offered here, never played.
    if (supplier.videoUrl) {
      await expect(page.getByRole("button", { name: `Play ${supplier.name} video` })).toBeVisible()
    }
    await expect(page.getByRole("link", { name: /^(Request a quote|Request service quote)$/ }).first()).toHaveAttribute(
      "href",
      `/marketplace/quote?supplierSlug=${SUPPLIER_SLUG}`,
    )

    if (products.length === 0) {
      await expect(page.getByRole("heading", { level: 2, name: "Catalogue coming soon" })).toBeVisible()
      return
    }
    const offerings = `${products.length} ${products.length === 1 ? "offering" : "offerings"} ready to compare`
    await expect(page.getByRole("heading", { level: 2, name: offerings })).toBeVisible()
    await expect(cards(page)).toHaveCount(products.length)
    for (const product of products) {
      await expect(cards(page).getByRole("heading", { level: 3, name: product.name, exact: true })).toBeVisible()
    }
  })

  test("opens a product from the supplier page", async ({ page, request }) => {
    const { data: supplier } = await apiGet<SupplierRecord>(request, `marketplace/suppliers/${SUPPLIER_SLUG}`)
    const [product] = supplier.products ?? []
    test.skip(!product, "the supplier has no products")
    if (!product) return

    await open(page, `/marketplace/supplier/${SUPPLIER_SLUG}`)
    await cards(page).getByRole("link", { name: product.name, exact: true }).click()

    await expect(page).toHaveURL(`/marketplace/product/${product.slug}`)
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible()
  })

  test("takes a visitor from the supplier to a quote request for that supplier", async ({ page, request }) => {
    const { data: supplier } = await apiGet<SupplierRecord>(request, `marketplace/suppliers/${SUPPLIER_SLUG}`)

    await open(page, `/marketplace/supplier/${SUPPLIER_SLUG}`)
    await page.getByRole("link", { name: /^(Request a quote|Request service quote)$/ }).first().click()

    await expect(page).toHaveURL(`/marketplace/quote?supplierSlug=${SUPPLIER_SLUG}`)
    await expect(page.getByRole("heading", { level: 1, name: `Book ${supplier.name} For Consultations` })).toBeVisible()
  })
})

// ─── Product page ─────────────────────────────────────────────────────────────

test.describe("product page", () => {
  test("shows the product with its price, quantity and seller", async ({ page, request }) => {
    const { data: product } = await apiGet<ProductRecord>(request, `marketplace/products/${PRODUCT_SLUG}`)
    const { supplier } = product
    if (!supplier) throw new Error(`The API returned no seller for ${PRODUCT_SLUG}`)
    const service = supplier.kind === "SERVICE"

    await open(page, `/marketplace/product/${PRODUCT_SLUG}`)

    await expect(page).toHaveTitle(new RegExp(`^${escapeRegExp(product.name)} - Alivia Marketplace`))
    await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible()
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(breadcrumb.getByRole("link", { name: "Marketplace", exact: true })).toHaveAttribute("href", "/marketplace")
    if (product.category) {
      await expect(breadcrumb.getByRole("link", { name: product.category.name, exact: true })).toHaveAttribute(
        "href",
        `/marketplace/category/${product.categorySlug}`,
      )
    }

    const buyBox = page.getByRole("region", { name: service ? "Rate and booking" : "Price and quote" })
    await expect(buyBox).toContainText(/৳|Ask for price/)
    await expect(buyBox.getByRole("spinbutton", { name: /^Quantity/ })).toBeVisible()
    await expect(buyBox.getByRole("button", { name: "Add to quote list" })).toBeVisible()
    await expect(buyBox.getByRole("link", { name: "Ask for price now" })).toHaveAttribute(
      "href",
      new RegExp(`^/marketplace/quote\\?productId=.+&productSlug=${PRODUCT_SLUG}&`),
    )
    await expect(page.getByRole("heading", { level: 2, name: service ? "Service details" : "Product details" })).toBeVisible()
    const seller = page.getByRole("region", { name: service ? "Provided by" : "Sold by" })
    await expect(seller).toContainText(supplier.name)
    await expect(seller.getByRole("link", { name: service ? "Visit provider" : "Visit seller" })).toHaveAttribute(
      "href",
      `/marketplace/supplier/${supplier.slug}`,
    )
  })

  test("takes a visitor from the product to a quote request for it", async ({ page, request }) => {
    const { data: product } = await apiGet<ProductRecord>(request, `marketplace/products/${PRODUCT_SLUG}`)

    await open(page, `/marketplace/product/${PRODUCT_SLUG}`)
    await page.getByRole("link", { name: "Ask for price now" }).click()

    await expect(page).toHaveURL(new RegExp(`/marketplace/quote\\?productId=.+&productSlug=${PRODUCT_SLUG}&`))
    await expect(page.getByRole("heading", { level: 1, name: `Book For Consultations for ${product.name}` })).toBeVisible()
  })
})

// ─── Quote list, quote form and price request (rendered or walked, never submitted) ──

test.describe("quote list, quote form and price request", () => {
  test("shows an empty quote list to a new visitor", async ({ page }) => {
    await open(page, "/marketplace/cart")

    await expect(page.getByRole("heading", { level: 1, name: "Your quote list" })).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Your quote list is empty" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Browse the marketplace" })).toHaveAttribute("href", "/marketplace")
    await expect(page.getByRole("link", { name: "Describe what you need" })).toHaveAttribute("href", "/marketplace/request")
  })

  test("adds a product to the quote list and removes it again", async ({ page }) => {
    // Only the visitor's own localStorage changes; nothing is sent to the server and nothing is submitted.
    await open(page, CATEGORY_PATH)
    await toolbarReady(page)
    const [name] = await cardNames(page)
    expect(name, "the category lists a product to add").toBeTruthy()

    const add = page.getByRole("button", { name: `Add ${name} to quote list` })
    await add.click()

    await expect(add).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("link", { name: "Quote list, 1 product" }).first().click()
    await expect(page).toHaveURL("/marketplace/cart")
    await expect(page.getByRole("heading", { level: 1, name: "Your quote list" })).toBeVisible()
    await expect(
      page.getByRole("list", { name: "Products in your quote list" }).getByRole("link", { name, exact: true }).first(),
    ).toBeVisible()

    await page.getByRole("button", { name: `Remove ${name}` }).click()

    await expect(page.getByRole("heading", { level: 2, name: "Your quote list is empty" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible()
  })

  test("shows the quote form with its fields", async ({ page }) => {
    await open(page, "/marketplace/quote")

    await expect(page.getByRole("heading", { level: 1, name: "Book For Consultations" })).toBeVisible()
    for (const field of ["What do you need? *", "Delivery address *", "Full name *", "Phone *", "Email *"]) {
      await expect(page.getByRole("textbox", { name: field })).toBeVisible()
    }
    // Present and ready, not pressed.
    await expect(page.getByRole("button", { name: "Submit Quote Request" })).toBeEnabled()
  })

  test("starts the price request at the sellers of the category it was opened from", async ({ page, request }) => {
    const { department, category } = await categoryUnderTest(request)
    const { data: sellers } = await apiGet<Named[]>(request, `marketplace/suppliers?category=${CATEGORY_SLUG}&limit=48`)
    await open(page, CATEGORY_PATH)

    await page.getByRole("link", { name: "Ask for a price" }).first().click()

    await expect(page).toHaveURL(`/marketplace/request?dept=${department.slug}&cat=${CATEGORY_SLUG}`)
    await expect(page.getByRole("heading", { level: 2, name: `Choose sellers for ${category.name}` })).toBeVisible()
    for (const seller of sellers) {
      await expect(page.getByRole("button", { name: new RegExp(`^${escapeRegExp(seller.name)}`) })).toBeVisible()
    }
    await expect(page.getByRole("button", { name: /^(Skip, match me|Continue)/ })).toBeVisible()
  })

  test("walks the price request from a department to its sellers", async ({ page, request }) => {
    const [department] = await departmentsWithCategories(request)
    const category = department.categories[0]

    await open(page, "/marketplace/request")
    await pageHydrated(page)
    await expect(page.getByRole("heading", { level: 1, name: "Ask for a price in a few taps" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled()

    await page.getByRole("button", { name: new RegExp(`^${escapeRegExp(department.name)}`) }).click()
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled()
    await continueTo(page, `Pick a type in ${department.name}`)

    await page.getByRole("button", { name: category.name, exact: true }).click()
    await continueTo(page, `Choose sellers for ${category.name}`)
  })
})

// ─── Addresses that do not exist ──────────────────────────────────────────────

test.describe("unknown addresses", () => {
  // The not-found page is streamed after the layout, so it comes with status 200 today. If it ever
  // answers a real 404, that response is expected here.
  test.use({ allowedErrors: [/\/marketplace\/(category|supplier|product)\/no-such-[a-z]+ -> 404/] })

  for (const path of [
    "/marketplace/category/no-such-category",
    "/marketplace/supplier/no-such-supplier",
    "/marketplace/product/no-such-product",
  ]) {
    test(`shows the not-found page for ${path}`, async ({ page }) => {
      await open(page, path)

      await expect(page.getByRole("heading", { level: 2, name: "This page could not be found." })).toBeVisible()
    })
  }
})
