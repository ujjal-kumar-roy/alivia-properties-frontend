import type { Locator, Page } from "@playwright/test"
import { formatPrice } from "../src/utils/format-price"
import { test, expect, type ApiClient } from "./fixtures"
import { KNOWN_BUG, getData, getJson, hydrated, open, openProperty } from "./helpers"

// Public property pages, signed out: the listing (cards, pages, sorts, purpose filter), one property's
// detail page, the map search and the compare table. Read-only: nothing here submits a form or saves
// a thing, and compare only touches the browser's own localStorage. The view ping a property page sends
// (POST /properties/:id/view) is answered by the fixtures, so no view is counted.
//
// The API is asked once per worker for the numbers the pages must agree with (totals, cheapest and
// dearest price), so a list that silently came back empty or unfiltered cannot pass.

const DETAIL_SLUG = "4-bed-apartment-for-sale-in-khalishpur-khalishpur"
/** The listing asks the API for 12 properties per page; the map search asks for 8. */
const PAGE_SIZE = 12
const MAP_PAGE_SIZE = 8
/** How long a retried order check may take: the new order may still be loading. */
const SETTLE = { timeout: 20_000 }

/** A card price as formatPrice(amount, true) prints it: "৳62 L", "৳7.50 Cr", "৳55,000". */
const AMOUNT = /^৳([\d,]+(?:\.\d+)?)(?: (L|Cr))?$/
const SQFT = /^[\d,]+ sq ft$/
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/

type Facts = {
  total: number
  sale: number
  rent: number
  /** The title of the API's first property in its default order, which the page lists as "Newest first". */
  newestTitle: string
  /** The price text a card shows for the cheapest and the dearest property. */
  cheapest: string
  dearest: string
}

let facts: Facts

test.describe.configure({ mode: "parallel" })

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext()
  try {
    const ask = async (query: string) => {
      const body = await getJson<{ data: { title: string; price: number }[]; meta: { total: number } }>(
        request,
        `properties?limit=1&${query}`,
      )
      return { total: body.meta.total, first: body.data[0] }
    }
    const all = await ask("")
    const sale = await ask("purpose=SALE")
    const rent = await ask("purpose=RENT")
    const cheapest = await ask("sort=price:asc")
    const dearest = await ask("sort=price:desc")
    expect(all.first, "the API lists at least one property").toBeDefined()
    facts = {
      total: all.total,
      sale: sale.total,
      rent: rent.total,
      newestTitle: all.first.title,
      cheapest: formatPrice(cheapest.first.price, true),
      dearest: formatPrice(dearest.first.price, true),
    }
  } finally {
    await request.dispose()
  }
})

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

/** The listing cards (each PropertyCard is an <article>); the same cards fill the map search. */
const cardsOf = (page: Page) => page.getByRole("article")

const titleOf = (card: Locator) => card.getByRole("heading", { level: 3 })

function takaOf(text: string): number {
  const match = AMOUNT.exec(text)
  if (!match) throw new Error(`"${text}" is not a card price`)
  const unit = match[2] === "Cr" ? 10_000_000 : match[2] === "L" ? 100_000 : 1
  return Number(match[1].replaceAll(",", "")) * unit
}

/** Each card's price as a number. */
const pricesOn = async (cards: Locator) => (await cards.getByText(AMOUNT).allTextContents()).map(takaOf)

/** Each card's size as a number, for the cards sized in square feet (land is sized in katha and the like). */
const sqftOn = async (cards: Locator) =>
  (await cards.getByText(SQFT).allTextContents()).map((text) => Number(text.replace(/\D/g, "")))

/** Retries until `read` finds the cards in `order`: the new order may still be loading. */
async function expectOrder(
  cards: Locator,
  read: (cards: Locator) => Promise<number[]>,
  order: "ascending" | "descending",
  atLeast: number,
) {
  await expect(async () => {
    const values = await read(cards)
    expect(values.length, "cards with a value to compare").toBeGreaterThanOrEqual(atLeast)
    expect(values).toEqual([...values].sort((a, b) => (order === "ascending" ? a - b : b - a)))
  }).toPass(SETTLE)
}

/** Opens the listing (or `from`) and picks `label` in the toolbar's sort menu. */
async function sortBy(page: Page, label: string, from = "/properties") {
  await open(page, from)
  const select = page.getByRole("combobox", { name: "Sort listings" })
  await hydrated(select)
  await select.selectOption({ label })
  return select
}

/** Opens the listing and presses a purpose chip in the filter sidebar. */
async function choosePurpose(page: Page, name: "Buy" | "Rent") {
  await open(page, "/properties")
  const chip = page.getByRole("button", { name, exact: true })
  await hydrated(chip)
  await chip.click()
  return chip
}

/** The list after a purpose filter: its cards all carry `badge` (or the empty state when nothing matches). */
async function expectPurposeList(page: Page, total: number, badge: "For sale" | "For rent") {
  if (total === 0) {
    await expect(page.getByRole("heading", { name: "No properties found" })).toBeVisible()
    return
  }
  const other = badge === "For sale" ? "For rent" : "For sale"
  const cards = cardsOf(page)
  const onPage = Math.min(PAGE_SIZE, total)
  await expect(page.getByText(`${total} listings found`)).toBeVisible()
  await expect(cards).toHaveCount(onPage)
  await expect(cards.getByText(badge, { exact: true })).toHaveCount(onPage)
  await expect(cards.getByText(other, { exact: true })).toHaveCount(0)
}

// ---------------------------------------------------------------------------------------------
// The listing
// ---------------------------------------------------------------------------------------------

test.describe("property list", () => {
  test("lists a page of property cards and the total the API reports", async ({ page }) => {
    await open(page, "/properties")

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(cardsOf(page)).toHaveCount(Math.min(PAGE_SIZE, facts.total))
    await expect(page.getByText(`${facts.total} listings found`)).toBeVisible()
  })

  test("shows each card's title, price, sale or rent badge and a link to the listing", async ({ page }) => {
    await open(page, "/properties")

    const cards = cardsOf(page)
    await expect(cards.first()).toBeVisible()
    for (const card of await cards.all()) {
      await expect(titleOf(card)).toHaveText(/\S/)
      await expect(card.getByRole("link")).toHaveAttribute("href", /^\/properties\/[\w-]+$/)
      await expect(card.getByText(AMOUNT)).toBeVisible()
      await expect(card.getByText(/^For (sale|rent)$/)).toBeVisible()
    }
  })

  test("moves to the next page of listings and back", async ({ page }) => {
    test.skip(facts.total <= PAGE_SIZE, "needs more than one page of properties")
    await open(page, "/properties")

    const cards = cardsOf(page)
    await expect(cards).toHaveCount(PAGE_SIZE)
    const firstTitle = await titleOf(cards.first()).innerText()

    const pageTwo = page.getByRole("button", { name: "Page 2", exact: true })
    await hydrated(pageTwo)
    await pageTwo.click()

    await expect(page).toHaveURL(/[?&]page=2(&|$)/)
    await expect(pageTwo).toHaveAttribute("aria-current", "page")
    await expect(cards).toHaveCount(Math.min(PAGE_SIZE, facts.total - PAGE_SIZE))
    await expect(titleOf(cards.first())).not.toHaveText(firstTitle)

    await page.getByRole("button", { name: "Previous page" }).click()

    await expect(page).toHaveURL(/[?&]page=1(&|$)/)
    await expect(titleOf(cards.first())).toHaveText(firstTitle)
  })

  test("shows the empty state when no property matches the area filter", async ({ page }) => {
    await open(page, "/properties")

    const area = page.getByLabel("Area or keyword")
    await hydrated(area)
    await area.fill("zzzqqq-no-such-area")

    await expect(page).toHaveURL(/[?&]area=zzzqqq-no-such-area(&|$)/)
    await expect(page.getByRole("heading", { name: "No properties found" })).toBeVisible()
    await expect(page.getByText("Try adjusting your filters or search to find more results.")).toBeVisible()
    await expect(cardsOf(page)).toHaveCount(0)
    await expect(page.getByText("0 listings found")).toBeVisible()

    await area.fill("")

    await expect(page.getByText(`${facts.total} listings found`)).toBeVisible()
    await expect(cardsOf(page).first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------------------------
// Sorting: Newest, Price low to high, Price high to low, Largest first
// ---------------------------------------------------------------------------------------------

test.describe("sorting", () => {
  test("sorts by newest first and returns to the default order", async ({ page }) => {
    const select = await sortBy(page, "Newest first", "/properties?sortBy=price-asc")

    await expect(page).not.toHaveURL(/sortBy=/)
    await expect(select).toHaveValue("")
    const cards = cardsOf(page)
    await expect(titleOf(cards.first())).toHaveText(facts.newestTitle)
    await expect(cards).toHaveCount(Math.min(PAGE_SIZE, facts.total))
  })

  test("sorts by price, low to high", async ({ page }) => {
    const select = await sortBy(page, "Price: low to high")

    await expect(page).toHaveURL(/[?&]sortBy=price-asc(&|$)/)
    await expect(select).toHaveValue("price-asc")
    const cards = cardsOf(page)
    await expect(cards.first().getByText(AMOUNT)).toHaveText(facts.cheapest)
    await expectOrder(cards, pricesOn, "ascending", Math.min(PAGE_SIZE, facts.total))
  })

  test("sorts by price, high to low", async ({ page }) => {
    const select = await sortBy(page, "Price: high to low")

    await expect(page).toHaveURL(/[?&]sortBy=price-desc(&|$)/)
    await expect(select).toHaveValue("price-desc")
    const cards = cardsOf(page)
    await expect(cards.first().getByText(AMOUNT)).toHaveText(facts.dearest)
    await expectOrder(cards, pricesOn, "descending", Math.min(PAGE_SIZE, facts.total))
  })

  test("sorts by largest first", async ({ page }) => {
    const select = await sortBy(page, "Largest first")

    await expect(page).toHaveURL(/[?&]sortBy=size-desc(&|$)/)
    await expect(select).toHaveValue("size-desc")
    const cards = cardsOf(page)
    await expect(cards).toHaveCount(Math.min(PAGE_SIZE, facts.total))
    await expectOrder(cards, sqftOn, "descending", 2)
  })

  test("falls back to newest first for a sort the toolbar no longer offers", async ({ page }) => {
    await open(page, "/properties?sortBy=rating")

    const cards = cardsOf(page)
    await expect(titleOf(cards.first())).toHaveText(facts.newestTitle)
    await expect(cards).toHaveCount(Math.min(PAGE_SIZE, facts.total))
  })

  test("starts again from the first page when the order changes", async ({ page }) => {
    test.skip(facts.total <= PAGE_SIZE, "needs more than one page of properties")

    await sortBy(page, "Price: high to low", "/properties?page=2")

    await expect(page).toHaveURL(/[?&]sortBy=price-desc(&|$)/)
    await expect(page).not.toHaveURL(/[?&]page=/)
    await expect(cardsOf(page).first().getByText(AMOUNT)).toHaveText(facts.dearest)
  })
})

// ---------------------------------------------------------------------------------------------
// The Buy and Rent purpose chips
// ---------------------------------------------------------------------------------------------

test.describe("purpose chips", () => {
  test("Buy lists only properties for sale", async ({ page }) => {
    const buy = await choosePurpose(page, "Buy")

    await expect(page).toHaveURL(/[?&]purpose=sale(&|$)/)
    await expect(buy).toHaveAttribute("aria-pressed", "true")
    await expectPurposeList(page, facts.sale, "For sale")
  })

  test("Rent lists only properties for rent, priced per month or year", async ({ page }) => {
    const rent = await choosePurpose(page, "Rent")

    await expect(page).toHaveURL(/[?&]purpose=rent(&|$)/)
    await expect(rent).toHaveAttribute("aria-pressed", "true")
    await expectPurposeList(page, facts.rent, "For rent")
    if (facts.rent > 0) {
      await expect(cardsOf(page).getByText(/^\/(month|year)$/)).toHaveCount(Math.min(PAGE_SIZE, facts.rent))
    }
  })

  test("pressing the active chip again lists every property", async ({ page }) => {
    const buy = await choosePurpose(page, "Buy")
    await expect(buy).toHaveAttribute("aria-pressed", "true")

    await buy.click()

    await expect(page).not.toHaveURL(/purpose=/)
    await expect(buy).toHaveAttribute("aria-pressed", "false")
    await expect(page.getByText(`${facts.total} listings found`)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------------------------
// One property's page
//
// The two tests that open the page directly fail on KNOWN_BUG.viewTransitionName: two React console
// errors on hydration at desktop width. Opening a property from a listing card does not log them.
// ---------------------------------------------------------------------------------------------

test.describe("property detail", () => {
  type Detail = {
    title: string
    description: string
    price: number
    facilities: string[]
    seller: { name: string; phone: string; isVerified: boolean }
  }

  const detailFromApi = (request: ApiClient) => getData<Detail>(request, `properties/${DETAIL_SLUG}`)

  test("shows the title, price and seller card, without an email address", { tag: "@known-bug" }, async ({
    page,
    request,
  }) => {
    test.fail(true, KNOWN_BUG.viewTransitionName)
    const property = await detailFromApi(request)

    // Waits for hydration, so the console errors of the known bug are always logged before the test ends.
    await openProperty(page, DETAIL_SLUG)

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(property.title)
    await expect(page.getByText(formatPrice(property.price), { exact: true }).first()).toBeVisible()

    const seller = page.getByRole("heading", { name: "Contact Seller" }).locator("..")
    await expect(seller).toContainText(property.seller.name)
    if (property.seller.isVerified) await expect(seller).toContainText("Verified Seller")
    await expect(seller.getByRole("link", { name: property.seller.phone })).toHaveAttribute(
      "href",
      `tel:${property.seller.phone}`,
    )
    await expect(seller.getByRole("button", { name: "Send inquiry" })).toBeVisible()

    // No email anywhere in the card: not as text, not as a mail link, not pre-filled into the form.
    await expect(seller).not.toContainText(EMAIL)
    for (const link of await seller.getByRole("link").all()) {
      await expect(link).not.toHaveAttribute("href", /^mailto:/i)
    }
    await expect(seller.getByLabel("Email address")).toHaveValue("")
  })

  test("describes the property: facts, description, facilities and location", { tag: "@known-bug" }, async ({
    page,
    request,
  }) => {
    test.fail(true, KNOWN_BUG.viewTransitionName)
    const property = await detailFromApi(request)

    await openProperty(page, DETAIL_SLUG)

    for (const label of ["Bedrooms", "Bathrooms", "Size"]) {
      await expect(page.getByText(label, { exact: true }).filter({ visible: true })).toBeVisible()
    }
    await expect(page.getByRole("heading", { name: "Description", exact: true })).toBeVisible()
    await expect(page.getByText(property.description.slice(0, 60).trim())).toBeVisible()

    if (property.facilities.length > 0) {
      await expect(page.getByRole("heading", { name: "Facilities", exact: true })).toBeVisible()
      for (const facility of property.facilities.slice(0, 3)) {
        await expect(page.getByText(facility, { exact: true }).first()).toBeVisible()
      }
    }
    await expect(page.getByRole("heading", { name: "Location", exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: "Get directions" })).toHaveAttribute("href", /google\.com\/maps/)
    await expect(page.getByRole("heading", { name: "Questions & answers", exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Reviews", exact: true })).toBeVisible()
  })

  test("opens a property from its listing card", async ({ page }) => {
    await open(page, "/properties")

    const card = cardsOf(page).first()
    await expect(card).toBeVisible()
    const title = await titleOf(card).innerText()
    await titleOf(card).click()

    await expect(page).toHaveURL(/\/properties\/[\w-]+$/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title)
  })

  test.describe("unknown property", () => {
    // Next may answer a not-found page with a 404 status; that is the expected answer here.
    test.use({ allowedErrors: [/\/properties\/no-such-property-e2e.* -> 404/] })

    test("shows the not-found page", async ({ page }) => {
      await open(page, "/properties/no-such-property-e2e")

      await expect(page.getByText("This page could not be found.")).toBeVisible()
    })
  })
})

// ---------------------------------------------------------------------------------------------
// Map search
// ---------------------------------------------------------------------------------------------

test.describe("map search", () => {
  const searchBox = (page: Page) => page.getByRole("searchbox", { name: "Search area, apartment or address" })

  test("lists properties beside the map", async ({ page }) => {
    await open(page, "/map-search")

    await expect(page.getByRole("heading", { level: 1, name: "Map Search" })).toBeVisible()
    await expect(searchBox(page)).toBeVisible()
    await expect(cardsOf(page)).toHaveCount(Math.min(MAP_PAGE_SIZE, facts.total))
    await expect(page.getByText(`${facts.total} properties`, { exact: true }).filter({ visible: true })).toBeVisible()
    await expect(page.getByRole("tabpanel", { name: "Map" })).toContainText("Interactive Map")
  })

  test("searching narrows the list to matching properties", async ({ page }) => {
    await open(page, "/map-search")

    await hydrated(searchBox(page))
    await searchBox(page).fill("Khalishpur")
    await searchBox(page).press("Enter")

    await expect(page).toHaveURL(/[?&]search=Khalishpur(&|$)/)
    await expect(searchBox(page)).toHaveValue("Khalishpur")
    const cards = cardsOf(page)
    await expect(cards.first()).toBeVisible()
    for (const text of await cards.allTextContents()) expect(text).toContain("Khalishpur")
  })

  test("says so when no property matches the search", async ({ page }) => {
    await open(page, "/map-search")

    await hydrated(searchBox(page))
    await searchBox(page).fill("zzzqqq-no-such-place")
    await searchBox(page).press("Enter")

    await expect(page.getByText("No properties match that search.")).toBeVisible()
    await expect(cardsOf(page)).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------------------------

test.describe("compare", () => {
  test("shows an empty compare table with a link back to the listings", async ({ page }) => {
    await open(page, "/compare")

    await expect(page.getByRole("heading", { level: 1, name: "Compare Properties" })).toBeVisible()
    await expect(page.getByText("No properties selected for comparison.")).toBeVisible()
    await expect(page.getByRole("link", { name: "Browse listings" })).toHaveAttribute("href", "/properties")
  })

  test("compares two properties picked on the listing", async ({ page }) => {
    await open(page, "/properties")
    const cards = cardsOf(page)
    await expect(cards.first()).toBeVisible()

    const picked: { title: string; price: string }[] = []
    for (const card of [cards.first(), cards.nth(1)]) {
      picked.push({ title: await titleOf(card).innerText(), price: await card.getByText(AMOUNT).innerText() })
      const compare = card.getByRole("button", { name: "Compare property" })
      await hydrated(compare)
      await compare.click()
      await expect(compare).toHaveAttribute("aria-pressed", "true")
    }

    await expect(page.getByText("2 properties selected")).toBeVisible()
    await page.getByRole("link", { name: "Compare now" }).click()

    await expect(page).toHaveURL(/\/compare$/)
    await expect(page.getByText("2 of 4 selected")).toBeVisible()
    for (const { title, price } of picked) {
      await expect(page.getByRole("link", { name: title, exact: true }).first()).toBeVisible()
      await expect(page.getByRole("row", { name: /^Price / })).toContainText(price)
    }

    await page.getByRole("button", { name: "Clear all" }).click()

    await expect(page.getByText("No properties selected for comparison.")).toBeVisible()
  })
})

// ---------------------------------------------------------------------------------------------
// The same listing on a phone, where the chips and the sort live in the page header and a sheet
// ---------------------------------------------------------------------------------------------

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("the Buy and Rent chips filter the list", async ({ page }) => {
    await open(page, "/properties")

    const chips = page.getByRole("navigation", { name: "Browse by purpose and type" })
    await expect(chips.getByRole("link", { name: "All", exact: true })).toHaveAttribute("aria-current", "page")

    await chips.getByRole("link", { name: "Buy", exact: true }).click()

    await expect(page).toHaveURL(/[?&]purpose=sale(&|$)/)
    await expect(chips.getByRole("link", { name: "Buy", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(page.getByText(`${facts.sale} listings`, { exact: true })).toBeVisible()
    const cards = cardsOf(page)
    await expect(cards).toHaveCount(Math.min(PAGE_SIZE, facts.sale))
    await expect(cards.getByText("Sale", { exact: true })).toHaveCount(Math.min(PAGE_SIZE, facts.sale))

    await chips.getByRole("link", { name: "Rent", exact: true }).click()

    await expect(page).toHaveURL(/[?&]purpose=rent(&|$)/)
    await expect(chips.getByRole("link", { name: "Rent", exact: true })).toHaveAttribute("aria-current", "page")
    await expect(page.getByText(`${facts.rent} listings`, { exact: true })).toBeVisible()
    await expect(cards.getByText("Rent", { exact: true })).toHaveCount(Math.min(PAGE_SIZE, facts.rent))
  })

  test("sorts from the Sort sheet", async ({ page }) => {
    await open(page, "/properties")

    const sortButton = page.getByRole("button", { name: "Sort: Newest first" })
    await hydrated(sortButton)
    await sortButton.click()
    const sheet = page.getByRole("dialog", { name: "Sort by" })
    await sheet.getByRole("radio", { name: "Price: low to high" }).click()

    await expect(page).toHaveURL(/[?&]sortBy=price-asc(&|$)/)
    await expect(sheet).toBeHidden()
    await expect(page.getByRole("button", { name: "Sort: Price: low to high" })).toBeVisible()
    const cards = cardsOf(page)
    await expect(cards.first().getByText(AMOUNT)).toHaveText(facts.cheapest)
    await expectOrder(cards, pricesOn, "ascending", Math.min(PAGE_SIZE, facts.total))
  })
})
