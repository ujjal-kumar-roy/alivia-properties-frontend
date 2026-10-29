import type { Locator, Page, Response } from "@playwright/test"
import { expect, test, type ApiClient } from "./fixtures"
import { COMPILE, MISSING_ID, escapeRegExp, getData, open } from "./helpers"

/*
 * The seller's marketplace catalogue, signed in as the demo seller (the `seller` project).
 *
 *   /seller/marketplace-catalogue                 a chip per supplier the seller owns, with its products
 *   /seller/marketplace-catalogue/products/new    the add-product form
 *   /seller/marketplace-catalogue/products/<id>   the edit-product form
 *
 * Data safety: this is the owner's real data. Nothing here saves, deletes or uploads. The forms are
 * rendered and read, never submitted, and the Save and Delete buttons are only checked for presence.
 * What the tests do click changes nothing but the screen (supplier chips, pickers) or re-reads the
 * list (Refresh).
 *
 * The catalogue page loads its suppliers on the Next server and shows an empty state when the API
 * errors, which the error collector cannot see. So the tests assert the data itself: chips and rows
 * are compared with what the API returns for the same login (`marketplace/seller/suppliers`).
 */

const CATALOGUE = "/seller/marketplace-catalogue"
const NEW_PRODUCT = `${CATALOGUE}/products/new`

type ApiProduct = {
  id: string
  name: string
  categorySlug: string
  price: number
  unit: string
  inStock: boolean
  isActive: boolean
  variants?: unknown[]
}
type ApiSupplier = { id: string; name: string; ownerId: string | null }
type OwnSupplier = ApiSupplier & { products: ApiProduct[] }

// ── What the API holds ──────────────────────────────────────────────────────

/** The suppliers the API hands the seller, each with its products: what the catalogue should show. */
async function loadOwnSuppliers(api: ApiClient) {
  const own = await getData<OwnSupplier[]>(api, "marketplace/seller/suppliers")
  expect(own.length, "the demo seller owns at least one supplier").toBeGreaterThan(0)
  return own
}

/** Suppliers that exist but are not in `own`: they belong to someone else, or to nobody. */
async function loadOtherSuppliers(api: ApiClient, own: ApiSupplier[]) {
  const all = await getData<ApiSupplier[]>(api, "marketplace/suppliers?limit=100")
  const ownIds = new Set(own.map((supplier) => supplier.id))
  return all.filter((supplier) => !ownIds.has(supplier.id))
}

/** A lookup from a category slug to the name the pages should show for it. */
async function loadCategoryNames(api: ApiClient) {
  const categories = await getData<{ slug: string; name: string }[]>(api, "marketplace/categories")
  return (slug: string) => {
    const name = categories.find((category) => category.slug === slug)?.name
    expect(name, `the category "${slug}" exists`).toBeDefined()
    return name as string
  }
}

// ── What the page shows ─────────────────────────────────────────────────────

const squash = (text: string) => text.replace(/\s+/g, "")

/** The page's main heading: the first thing to wait for after a navigation. */
const heading = (page: Page, name: string) => page.getByRole("heading", { level: 1, name, exact: true })

/** The supplier chips: one button per supplier the seller owns, reading "<name><product count>". */
const supplierChips = (page: Page) => page.getByRole("group", { name: "Supplier", exact: true }).getByRole("button")

const selectedChips = (page: Page) =>
  page.getByRole("group", { name: "Supplier", exact: true }).getByRole("button", { pressed: true })

/** The chip of one supplier, matched on its whole text: the name, then the product count. */
const chipFor = (page: Page, supplier: { name: string }) =>
  supplierChips(page).filter({ hasText: new RegExp(`^${escapeRegExp(supplier.name)}\\s*\\d+$`) })

const addProductLink = (page: Page) => page.getByRole("link", { name: "Add product", exact: true })

/**
 * The Edit action of a product row. It is an <a href> that Base UI's Button marks role="button",
 * so it is found as a button, not a link.
 */
const editAction = (scope: Page | Locator, product?: { name: string }) =>
  scope.getByRole("button", product ? { name: `Edit ${product.name}`, exact: true } : { name: /^Edit / })

/** The row of one product in the open supplier's list, found through its Edit action. */
const rowFor = (page: Page, product: { name: string }) =>
  page.getByRole("listitem").filter({ has: editAction(page, product) })

/** The Supplier / Category picker on the product form. It is a button; its text is the chosen option. */
const picker = (page: Page, name: "Supplier" | "Category") => page.getByRole("button", { name, exact: true })

/** The page header renders its copy twice (a phone row and a desktop panel); only one is displayed. */
const shown = (locator: Locator) => locator.filter({ visible: true })

/**
 * Clicks until `effect` holds. The pages are server-rendered, and a click in the moment before React
 * hydrates is ignored, so the click is repeated until the page reacts.
 */
async function clickUntil(target: Locator, effect: () => Promise<void>) {
  await expect(async () => {
    await target.click()
    await effect()
  }).toPass({ timeout: 45_000 })
}

async function chooseSupplier(page: Page, supplier: { name: string }) {
  const chip = chipFor(page, supplier)
  await clickUntil(chip, () => expect(chip).toHaveAttribute("aria-pressed", "true", { timeout: 3_000 }))
}

/** Like `clickUntil`, but never clicks an open picker again: a second click would close it. */
async function openPicker(button: Locator) {
  await expect(async () => {
    if ((await button.getAttribute("aria-expanded")) !== "true") await button.click()
    await expect(button).toHaveAttribute("aria-expanded", "true", { timeout: 3_000 })
  }).toPass({ timeout: 45_000 })
}

/** Opens the catalogue and waits for real data: when its API call fails the page shows an empty state, not an error. */
async function openCatalogue(page: Page) {
  await open(page, CATALOGUE)
  await expect(heading(page, "My Catalogue")).toBeVisible(COMPILE)
  await expect(supplierChips(page).first()).toBeVisible()
}

// ── The catalogue ───────────────────────────────────────────────────────────

test.describe("My Catalogue", () => {
  test("lists the seller's suppliers as chips, with the first one open", async ({ page }) => {
    await openCatalogue(page)
    const chips = supplierChips(page)

    await expect(
      shown(page.getByText(/^Add the products and services buyers see on your supplier profile/)),
    ).toBeVisible()
    await expect(chips.first()).toHaveText(/\S.*\d$/)
    await expect(chips.first()).toHaveAttribute("aria-pressed", "true")
    await expect(selectedChips(page)).toHaveCount(1)
    await expect(page.getByRole("heading", { level: 2, name: / catalogue$/ })).toBeVisible()
    await expect(addProductLink(page)).toBeVisible()
  })

  test("shows a supplier's products with category, stock, price and unit, and edit and delete actions", async ({
    page,
    apiAs,
  }) => {
    const api = await apiAs("seller")
    const supplier = (await loadOwnSuppliers(api)).find((candidate) => candidate.products.length > 0)
    if (!supplier) return test.skip(true, "The seller has no products yet")
    const categoryName = await loadCategoryNames(api)

    await openCatalogue(page)
    await chooseSupplier(page, supplier)

    const count = supplier.products.length
    await expect(
      page.getByText(`${count} ${count === 1 ? "listing" : "listings"} buyers can request a quote on`),
    ).toBeVisible()
    await expect(editAction(page)).toHaveCount(count)

    for (const product of supplier.products) {
      const row = rowFor(page, product)
      await expect(row).toContainText(product.name)
      await expect(row).toContainText(categoryName(product.categorySlug))
      await expect(row).toContainText(product.inStock ? "In stock" : "On order")
      // Products priced at 0 are "Quote" items; the others show a taka amount.
      await expect(row).toContainText(product.price > 0 ? "৳" : "Quote")
      await expect(row).toContainText(`/ ${product.unit}`)
      const variants = product.variants?.length ?? 0
      if (variants > 0) await expect(row).toContainText(`${variants} variant${variants === 1 ? "" : "s"}`)
      else await expect(row).not.toContainText("variant")

      await expect(editAction(row, product)).toHaveAttribute("href", `${CATALOGUE}/products/${product.id}`)
      // Looked at, never clicked: Delete removes the product for real.
      await expect(row.getByRole("button", { name: `Delete ${product.name}`, exact: true })).toBeEnabled()
    }
  })

  test("opens each supplier's own catalogue from its chip", async ({ page, apiAs }) => {
    const own = await loadOwnSuppliers(await apiAs("seller"))
    await openCatalogue(page)

    for (const supplier of own) {
      await chooseSupplier(page, supplier)
      await expect(
        page.getByRole("heading", { level: 2, name: `${supplier.name} catalogue`, exact: true }),
        `the heading of ${supplier.name}`,
      ).toBeVisible()
      await expect(selectedChips(page)).toHaveCount(1)
      await expect(addProductLink(page), `Add product for ${supplier.name}`).toHaveAttribute(
        "href",
        `${NEW_PRODUCT}?supplierId=${supplier.id}`,
      )
      await expect(editAction(page), `the products of ${supplier.name}`).toHaveCount(supplier.products.length)
      for (const product of supplier.products) {
        await expect(editAction(rowFor(page, product), product)).toHaveAttribute(
          "href",
          `${CATALOGUE}/products/${product.id}`,
        )
      }
    }
  })

  test("Refresh re-reads the catalogue from the API and keeps the list", async ({ page }) => {
    await openCatalogue(page)
    const chips = supplierChips(page)
    const before = await chips.allTextContents()
    const refresh = page.getByRole("button", { name: "Refresh", exact: true })
    const isSupplierListFetch = (response: Response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname.endsWith("/marketplace/seller/suppliers")

    await expect(async () => {
      const [response] = await Promise.all([
        page.waitForResponse(isSupplierListFetch, { timeout: 3_000 }),
        refresh.click(),
      ])
      expect(response.status()).toBe(200)
    }).toPass({ timeout: 45_000 })

    await expect(chips).toHaveText(before)
  })

  test("opens from My Catalogue in the seller sidebar", async ({ page }) => {
    await open(page, "/seller/dashboard")
    const sidebar = page.getByRole("complementary", { name: "Seller Workspace navigation" })

    await sidebar.getByRole("link", { name: "My Catalogue" }).click()

    await expect(page).toHaveURL(CATALOGUE)
    await expect(heading(page, "My Catalogue")).toBeVisible(COMPILE)
    await expect(sidebar.getByRole("link", { name: "My Catalogue" })).toHaveAttribute("aria-current", "page")
  })

  test("Add product carries the chosen supplier into the new-product form", async ({ page, apiAs }) => {
    const own = await loadOwnSuppliers(await apiAs("seller"))
    // Not the first supplier when there is a second: the first is what the form picks anyway.
    const supplier = own[1] ?? own[0]

    await openCatalogue(page)
    await chooseSupplier(page, supplier)
    await addProductLink(page).click()

    await expect(page).toHaveURL(`${NEW_PRODUCT}?supplierId=${supplier.id}`)
    await expect(heading(page, "Add product")).toBeVisible(COMPILE)
    await expect(picker(page, "Supplier")).toHaveText(supplier.name)
  })
})

// ── Ownership: only the seller's own items ──────────────────────────────────

test.describe("ownership", () => {
  test("lists exactly the suppliers the seller owns, and none that belong to someone else", async ({
    page,
    apiAs,
  }) => {
    const api = await apiAs("seller")
    const me = await getData<{ id: string }>(api, "auth/me")
    const own = await loadOwnSuppliers(api)
    const others = await loadOtherSuppliers(api, own)
    expect(
      own.map((supplier) => supplier.ownerId),
      "the API only hands the seller suppliers they own",
    ).toEqual(own.map(() => me.id))

    await openCatalogue(page)

    const shownChips = (await supplierChips(page).allTextContents()).map(squash).sort()
    expect(shownChips, "one chip per owned supplier, each with its product count").toEqual(
      own.map((supplier) => squash(`${supplier.name}${supplier.products.length}`)).sort(),
    )
    // Suppliers that exist but belong to someone else (or to nobody) must not turn up.
    for (const other of others) {
      await expect(chipFor(page, other), `${other.name} is not the seller's`).toHaveCount(0)
    }
  })

  test("the supplier picker on the new-product form offers only the seller's own suppliers", async ({
    page,
    apiAs,
  }) => {
    const own = await loadOwnSuppliers(await apiAs("seller"))
    await open(page, NEW_PRODUCT)
    await expect(heading(page, "Add product")).toBeVisible(COMPILE)

    await openPicker(picker(page, "Supplier"))

    const options = page.getByRole("listbox").getByRole("option")
    await expect(options).toHaveCount(own.length)
    const offered = (await options.allTextContents()).map((text) => text.trim()).sort()
    expect(offered).toEqual(own.map((supplier) => supplier.name).sort())
    await page.keyboard.press("Escape")
  })

  test("the new-product form does not pre-select a supplier that belongs to someone else", async ({
    page,
    apiAs,
  }) => {
    const api = await apiAs("seller")
    const [other] = await loadOtherSuppliers(api, await loadOwnSuppliers(api))
    if (!other) return test.skip(true, "Every supplier belongs to the seller")

    await open(page, `${NEW_PRODUCT}?supplierId=${other.id}`)

    await expect(heading(page, "Add product")).toBeVisible(COMPILE)
    await expect(picker(page, "Supplier")).toBeVisible()
    await expect(picker(page, "Supplier")).not.toContainText(other.name)
  })
})

test.describe("a product that is not in the seller's catalogue", () => {
  // Next answers 200 and streams its not-found page here (the route sits behind a loading skeleton), so
  // no 404 reaches the browser today. A real 404 for this URL would be just as right, so it is allowed.
  test.use({ allowedErrors: [/\/seller\/marketplace-catalogue\/products\/[0-9a-f]{24} -> 404/] })

  test("opens a not-found page, not an editor", async ({ page }) => {
    await open(page, `${CATALOGUE}/products/${MISSING_ID}`)

    await expect(page.getByText(/could not be found/i)).toBeVisible(COMPILE)
    await expect(heading(page, "Edit product")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0)
  })
})

// ── The product forms (render only) ─────────────────────────────────────────

test.describe("product forms", () => {
  test("the new-product form shows every section and field, ready and empty", async ({ page }) => {
    await open(page, NEW_PRODUCT)

    await expect(heading(page, "Add product")).toBeVisible(COMPILE)
    await expect(shown(page.getByText("Add a product to your catalogue."))).toBeVisible()
    const sections = ["Basics", "Media", "Specifications & highlights", "Variants & pricing", "Commerce & publishing"]
    for (const section of sections) {
      await expect(page.getByRole("heading", { level: 2, name: section, exact: true })).toBeVisible()
    }

    await expect(picker(page, "Supplier")).toBeVisible()
    await expect(picker(page, "Category")).toBeVisible()
    const fields = ["Product name", "Brand", "Unit", "Indicative price (BDT)", "MOQ", "Lead time (days)", "Badge"]
    for (const label of [...fields, "Description"]) {
      await expect(page.getByLabel(label, { exact: true }), label).toBeVisible()
    }
    // The short-description label carries a live character counter, so it is matched by its start.
    await expect(page.getByLabel(/^Short description/)).toBeVisible()
    await expect(page.getByText("Thumbnail (required)")).toBeVisible()
    const adders = ["Add variant", "Add price tier", "Add spec", "Add highlight", "Add certification", "Add document"]
    for (const add of adders) {
      await expect(page.getByRole("button", { name: add, exact: true }), add).toBeVisible()
    }

    await expect(page.getByLabel("Product name", { exact: true })).toHaveValue("")
    await expect(page.getByText("No changes")).toBeVisible()
    // Looked at, never clicked: Save would create a product.
    await expect(page.getByRole("button", { name: "Save product", exact: true })).toBeEnabled()
    // The sidebar still marks My Catalogue as the current page.
    const sidebar = page.getByRole("complementary", { name: "Seller Workspace navigation" })
    await expect(sidebar.getByRole("link", { name: "My Catalogue" })).toHaveAttribute("aria-current", "page")
  })

  test("the category picker lists categories and filters them as you type", async ({ page }) => {
    await open(page, NEW_PRODUCT)
    await expect(heading(page, "Add product")).toBeVisible(COMPILE)

    await openPicker(picker(page, "Category"))

    const options = page.getByRole("listbox").getByRole("option")
    await expect(options.first()).toBeVisible()
    expect(await options.count()).toBeGreaterThan(1)

    const search = page.getByRole("textbox", { name: /^Search categories/ })
    const firstLabel = (await options.first().innerText()).trim()
    await search.fill(firstLabel)
    await expect(options.first()).toContainText(firstLabel)

    await search.fill("zzzz no such category")
    await expect(page.getByText("No matches")).toBeVisible()
    await expect(options).toHaveCount(0)

    await page.keyboard.press("Escape")
    await expect(page.getByRole("listbox")).toHaveCount(0)
  })

  test("the edit form opens with the details of the product that was chosen", async ({ page, apiAs }) => {
    const api = await apiAs("seller")
    const supplier = (await loadOwnSuppliers(api)).find((candidate) => candidate.products.length > 0)
    if (!supplier) return test.skip(true, "The seller has no products yet")
    const product = supplier.products[0]
    const categoryName = await loadCategoryNames(api)

    await openCatalogue(page)
    await chooseSupplier(page, supplier)
    await editAction(page, product).click()

    await expect(page).toHaveURL(`${CATALOGUE}/products/${product.id}`)
    await expect(heading(page, "Edit product")).toBeVisible(COMPILE)
    await expect(page.getByLabel("Product name", { exact: true })).toHaveValue(product.name)
    await expect(picker(page, "Supplier")).toHaveText(supplier.name)
    await expect(picker(page, "Category")).toHaveText(categoryName(product.categorySlug))
    await expect(page.getByPlaceholder(/^Variant name/)).toHaveCount(product.variants?.length ?? 0)
    await expect(page.getByRole("checkbox", { name: "In stock" })).toBeChecked({ checked: product.inStock })
    await expect(page.getByRole("checkbox", { name: "Published (visible to buyers)" })).toBeChecked({
      checked: product.isActive,
    })

    await expect(page.getByText("No changes")).toBeVisible()
    // Looked at, never clicked: Save would change the product.
    await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled()
  })
})
