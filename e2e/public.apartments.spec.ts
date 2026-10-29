import type { Page } from "@playwright/test"
import { expect, test, type ApiClient } from "./fixtures"
import { KNOWN_BUG, getData, getJson, hydrated, open } from "./helpers"

// Public apartments (projects): the /apartments listing with its status chips, sort, filters and
// infinite scroll, and the /apartments/alivia-heights-2 detail page. Nothing is submitted: the one
// form that is opened (the enquiry sheet) is closed again without sending.
//
// Expected values come from the screen itself (labels, order, "N apartments") or from a read-only
// GET of the same API record, so edits to the owner's data do not break the tests.
//
// Opening an apartment's page records one view on that project: the Next server counts it after the
// response (`after()` in apartments/[slug]/page.tsx), where the browser cannot stub it. The tests that
// do it carry the tag @counts-view; leave them out with --grep-invert @counts-view.

const LIST_PATH = "/apartments"
const DETAIL_SLUG = "alivia-heights-2"
const DETAIL_PATH = `${LIST_PATH}/${DETAIL_SLUG}`

const STATUS_FILTERS = [
  { label: "Ongoing", status: "ongoing" },
  { label: "Upcoming", status: "upcoming" },
  { label: "Completed", status: "completed" },
] as const

type Order = "price-asc" | "price-desc" | "name-asc"

/** The toolbar's sort options, the `sort` each one puts in the URL (none for Newest), and what the cards can prove. */
const SORTS: { label: string; param: string | null; order: Order | null }[] = [
  { label: "Newest", param: null, order: null },
  { label: "Price: low to high", param: "priceFrom:asc", order: "price-asc" },
  { label: "Price: high to low", param: "priceFrom:desc", order: "price-desc" },
  { label: "Name A-Z", param: "name:asc", order: "name-asc" },
]

/** The "Starting price" chips: they filter on the starting price (minPrice / maxPrice, in taka). */
const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under ৳50L", max: 5_000_000 },
  { label: "৳50L-1Cr", min: 5_000_000, max: 10_000_000 },
  { label: "৳1Cr+", min: 10_000_000 },
]

// ── Reading the page ───────────────────────────────────────────────────────────────────────────

const cardsIn = (page: Page) => page.getByRole("article")
const sortSelect = (page: Page) => page.getByRole("combobox", { name: "Sort by" })
const statusChips = (page: Page) => page.getByRole("navigation", { name: "Filter apartments by status" })
const mainHeading = (page: Page) => page.getByRole("heading", { level: 1, name: "Alivia Apartments" })

type ListedCard = { name: string; href: string; text: string }

/** One consistent snapshot of the cards on screen (the infinite list keeps appending while we read). */
async function listedCards(page: Page): Promise<ListedCard[]> {
  return cardsIn(page).evaluateAll((articles) =>
    articles.map((article) => ({
      name: article.querySelector("h3")?.textContent?.trim() ?? "",
      href: article.querySelector("a")?.getAttribute("href") ?? "",
      text: (article as HTMLElement).innerText,
    })),
  )
}

/** The "N apartments" line (printed twice, once per breakpoint, so only the visible one counts). */
async function listedTotal(page: Page): Promise<number> {
  const count = page.getByText(/^\d+ apartments?$/).filter({ visible: true })
  await expect(count).toBeVisible()
  return Number(/\d+/.exec(await count.innerText())?.[0])
}

/** The status badge on a card ("ONGOING"): the one line of its text that is exactly a status. */
const cardStatus = (card: ListedCard) => /^(ongoing|upcoming|completed)$/im.exec(card.text)?.[1]?.toLowerCase()

const TAKA_UNITS: Record<string, number> = { L: 100_000, Cr: 10_000_000 }

/** The first price on a card in taka, i.e. the starting price: "৳96.3 L - ৳1.36 Cr" is 9,630,000. Null when unpriced. */
function startingPrice(cardText: string): number | null {
  const match = /৳\s*([\d,]+(?:\.\d+)?)\s*(Cr|L)?/.exec(cardText)
  if (!match) return null
  return Math.round(Number(match[1].replace(/,/g, "")) * (TAKA_UNITS[match[2] ?? ""] ?? 1))
}

/** Asserts the cards on screen are in `order`. Retries, so a list still swapping in is not read half-way. */
async function expectListedInOrder(page: Page, order: Order) {
  await expect(async () => {
    const cards = await listedCards(page)
    expect(cards.length, "apartments listed").toBeGreaterThan(0)

    if (order === "name-asc") {
      const names = cards.map((card) => card.name.toLowerCase())
      expect(names, "apartment names, in the order the cards are listed").toEqual([...names].sort())
      return
    }
    const prices = cards.map((card) => startingPrice(card.text)).filter((price): price is number => price !== null)
    expect(prices.length, "cards with a readable starting price").toBeGreaterThanOrEqual(2)
    const sorted = [...prices].sort((a, b) => (order === "price-asc" ? a - b : b - a))
    expect(prices, "starting prices, in the order the cards are listed").toEqual(sorted)
  }).toPass({ timeout: 15_000 })
}

// ── Reading the API (public, read-only) ────────────────────────────────────────────────────────

type ApiProject = {
  slug: string
  name: string
  status: string
  tagline: string | null
  description: string | null
  address: string | null
  amenities: string[]
  units: { name?: string | null; type?: string | null }[]
  totalUnits: number | null
  developerName: string | null
  isFeatured: boolean
}

function apiProjects(request: ApiClient, query: Record<string, string> = {}) {
  const params = new URLSearchParams({ limit: "1", ...query })
  return getJson<{ data: ApiProject[]; meta: { total: number } }>(request, `projects?${params}`)
}

/** How many apartments the API says match `query`: what the page's "N apartments" must agree with. */
async function apiTotal(request: ApiClient, query: Record<string, string> = {}) {
  return (await apiProjects(request, query)).meta.total
}

const apiProject = (request: ApiClient, slug: string) => getData<ApiProject>(request, `projects/${slug}`)

// ── The listing ────────────────────────────────────────────────────────────────────────────────

test.describe("apartments listing", () => {
  test("lists apartment cards with name, status, location and starting price", async ({ page }) => {
    await open(page, LIST_PATH)

    await expect(mainHeading(page)).toBeVisible()
    const first = cardsIn(page).first()
    await expect(first).toBeVisible()
    await expect(first.getByRole("heading", { level: 3 })).not.toBeEmpty()
    await expect(first.getByText(/^(ongoing|upcoming|completed)$/i)).toBeVisible()
    await expect(first).toContainText(/৳\s*\d/)
    await expect(first.getByRole("link").first()).toHaveAttribute("href", /^\/apartments\/[\w-]+$/)
  })

  test("shows the same number of apartments as the API", async ({ page, request }) => {
    const expected = await apiTotal(request)
    await open(page, LIST_PATH)

    expect(await listedTotal(page)).toBe(expected)
  })

  test("opens an apartment's page from its card", { tag: "@counts-view" }, async ({ page }) => {
    await open(page, LIST_PATH)

    const name = cardsIn(page).first().getByRole("heading", { level: 3 })
    await expect(name).toBeVisible()
    const title = (await name.innerText()).trim()
    await name.click()

    await expect(page).toHaveURL(/\/apartments\/[\w-]+$/)
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible()
  })

  test("keeps loading more apartments as the list is scrolled, in order and without repeats", async ({ page }) => {
    await open(page, `${LIST_PATH}?sort=${encodeURIComponent("priceFrom:asc")}`)

    const total = await listedTotal(page)
    await expect(cardsIn(page).first()).toBeVisible()
    test.skip(total <= (await cardsIn(page).count()), "every apartment fits on the first page")

    // The next page loads when the end of the list nears the screen, so keep going to the bottom.
    await expect(async () => {
      await page.evaluate(() => window.scrollTo(0, Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)))
      await expect(cardsIn(page)).toHaveCount(total, { timeout: 3_000 })
    }).toPass({ timeout: 40_000 })

    const cards = await listedCards(page)
    expect(new Set(cards.map((card) => card.href)).size, "distinct apartments listed").toBe(total)
    await expectListedInOrder(page, "price-asc")
  })
})

// ── Status filter ──────────────────────────────────────────────────────────────────────────────

test.describe("apartments status filter", () => {
  test("offers All, Ongoing, Upcoming and Completed with All selected", async ({ page }) => {
    await open(page, LIST_PATH)

    const chips = statusChips(page)
    for (const label of ["All", ...STATUS_FILTERS.map((filter) => filter.label)]) {
      await expect(chips.getByRole("link", { name: label, exact: true })).toBeVisible()
    }
    await expect(chips.getByRole("link", { name: "All", exact: true })).toHaveAttribute("aria-current", "page")
  })

  for (const { label, status } of STATUS_FILTERS) {
    test(`${label} lists only ${status} apartments, as many as the API has`, async ({ page, request }) => {
      const expected = await apiTotal(request, { status: status.toUpperCase() })
      await open(page, LIST_PATH)

      const chip = statusChips(page).getByRole("link", { name: label, exact: true })
      await chip.click()

      await expect(page).toHaveURL((url) => url.searchParams.get("status") === status)
      await expect(chip).toHaveAttribute("aria-current", "page")
      expect(await listedTotal(page)).toBe(expected)

      if (expected === 0) {
        await expect(page.getByRole("heading", { name: "No apartments found" })).toBeVisible()
        return
      }
      await expect(cardsIn(page).first()).toBeVisible()
      const statuses = (await listedCards(page)).map(cardStatus)
      expect(statuses.length, "apartments listed").toBeGreaterThan(0)
      expect(new Set(statuses), "statuses shown on the cards").toEqual(new Set([status]))
    })
  }

  test("All brings every apartment back after a status was chosen", async ({ page, request }) => {
    const expected = await apiTotal(request)
    await open(page, `${LIST_PATH}?status=completed`)

    const all = statusChips(page).getByRole("link", { name: "All", exact: true })
    await all.click()

    await expect(page).toHaveURL((url) => url.searchParams.get("status") === null)
    await expect(all).toHaveAttribute("aria-current", "page")
    expect(await listedTotal(page)).toBe(expected)
  })
})

// ── Sorting ────────────────────────────────────────────────────────────────────────────────────

test.describe("apartments sorting", () => {
  for (const sort of SORTS) {
    test(`sorting by "${sort.label}" still lists apartments${sort.order ? ", in that order" : ""}`, async ({ page, request }) => {
      // Start from a different order, so the change shows in the URL and in the list.
      await open(page, sort.param ? LIST_PATH : `${LIST_PATH}?sort=${encodeURIComponent("name:asc")}`)

      const select = sortSelect(page)
      await hydrated(select)
      await select.selectOption({ label: sort.label })

      await expect(page).toHaveURL((url) => url.searchParams.get("sort") === sort.param)
      await expect(select).toHaveValue(sort.param ?? "")
      await expect(cardsIn(page).first()).toBeVisible()
      if (sort.order) await expectListedInOrder(page, sort.order)

      if (!sort.param) {
        // Newest has no order to read off the cards, but it is the API's default order: the newest apartment comes first.
        const [newest] = (await apiProjects(request)).data
        await expect(cardsIn(page).first().getByRole("link").first()).toHaveAttribute("href", `${LIST_PATH}/${newest.slug}`)
      }
    })
  }

  test("a shared sorted link opens with that sort selected and in order", async ({ page }) => {
    await open(page, `${LIST_PATH}?sort=${encodeURIComponent("priceFrom:desc")}`)

    await expect(sortSelect(page)).toHaveValue("priceFrom:desc")
    await expect(cardsIn(page).first()).toBeVisible()
    await expectListedInOrder(page, "price-desc")
  })

  // The API answers 400 to a sort field it does not allow. A hand-edited or stale link should still show the list.
  test(
    "an unknown sort in the URL falls back to the default list instead of an error page",
    { tag: "@known-bug" },
    async ({ page }) => {
      test.fail(true, KNOWN_BUG.apartmentsErrorScreen)
      await open(page, `${LIST_PATH}?sort=${encodeURIComponent("hackField:asc")}`)

      await expect(mainHeading(page)).toBeVisible()
      await expect(cardsIn(page).first()).toBeVisible()
    },
  )
})

// ── Other filters ──────────────────────────────────────────────────────────────────────────────

test.describe("apartments search and price filters", () => {
  test("narrows the list to apartments matching a typed name", async ({ page, request }) => {
    const [{ name }] = (await apiProjects(request)).data
    const term = name.split(" ").at(-1) ?? name
    const expected = await apiTotal(request, { search: term })
    await open(page, LIST_PATH)

    const search = page.getByRole("searchbox", { name: "Name or location" })
    await hydrated(search)
    await search.fill(term)

    await expect(page).toHaveURL((url) => url.searchParams.get("search") === term)
    await expect(page.getByText(`Search: ${term}`)).toBeVisible()
    await expect(cardsIn(page).first()).toBeVisible()
    expect(await listedTotal(page)).toBe(expected)
    const names = (await listedCards(page)).map((card) => card.name.toLowerCase())
    expect(names.some((listed) => listed.includes(term.toLowerCase())), `a listed name contains "${term}"`).toBe(true)
  })

  test("shows an empty state when no apartment matches the search", async ({ page }) => {
    await open(page, `${LIST_PATH}?search=${encodeURIComponent("zzqxj no such apartment")}`)

    await expect(page.getByRole("heading", { name: "No apartments found" })).toBeVisible()
    await expect(page.getByText("No apartments match the selected filters.")).toBeVisible()
    await expect(cardsIn(page)).toHaveCount(0)
    expect(await listedTotal(page)).toBe(0)
  })

  for (const preset of PRICE_PRESETS) {
    test(`"${preset.label}" lists only apartments starting in that price range`, async ({ page, request }) => {
      const query: Record<string, string> = {}
      if (preset.min !== undefined) query.minPrice = String(preset.min)
      if (preset.max !== undefined) query.maxPrice = String(preset.max)
      const expected = await apiTotal(request, query)
      await open(page, LIST_PATH)

      const chip = page.getByRole("button", { name: preset.label, exact: true })
      await hydrated(chip)
      await chip.click()

      await expect(chip).toHaveAttribute("aria-pressed", "true")
      await expect(page).toHaveURL(
        (url) =>
          url.searchParams.get("minPrice") === (preset.min === undefined ? null : String(preset.min)) &&
          url.searchParams.get("maxPrice") === (preset.max === undefined ? null : String(preset.max)),
      )
      expect(await listedTotal(page)).toBe(expected)

      if (expected === 0) {
        await expect(page.getByRole("heading", { name: "No apartments found" })).toBeVisible()
        return
      }
      await expect(cardsIn(page).first()).toBeVisible()
      const prices = (await listedCards(page)).map((card) => startingPrice(card.text))
      for (const price of prices) {
        expect(price, "every listed card shows a starting price").not.toBeNull()
        expect(price ?? 0).toBeGreaterThanOrEqual(preset.min ?? 0)
        expect(price ?? 0).toBeLessThanOrEqual(preset.max ?? Number.POSITIVE_INFINITY)
      }
    })
  }
})

// ── The detail page ────────────────────────────────────────────────────────────────────────────

/** A section of the page by its heading ("Amenities"): the accordion that wraps the heading and its content. */
const sectionOf = (page: Page, title: string) =>
  page.locator("details").filter({ has: page.getByRole("heading", { level: 2, name: title, exact: true }) })

/** The enquiry card in the sidebar (the target of every "#enquire" link). */
const enquiryCard = (page: Page) => page.locator("#enquire")

test.describe("apartment detail page", { tag: "@counts-view" }, () => {
  test("opens with the apartment's name, status, tagline and location", async ({ page, request }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    const heading = page.getByRole("heading", { level: 1, name: project.name })
    await expect(heading).toBeVisible()
    const header = page.locator("header").filter({ has: heading })
    const status = project.status.charAt(0) + project.status.slice(1).toLowerCase()
    await expect(header.getByText(status, { exact: true })).toBeVisible()
    if (project.isFeatured) await expect(header.getByText("Featured", { exact: true })).toBeVisible()
    if (project.tagline) await expect(header.getByText(project.tagline)).toBeVisible()
    if (project.address && !/^https?:/i.test(project.address)) {
      await expect(header.getByText(project.address)).toBeVisible()
    }
  })

  test("shows the photo gallery", async ({ page, request }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    const gallery = page.getByRole("region", { name: `${project.name} image gallery` })
    await expect(gallery).toBeVisible()
    await expect(gallery.getByRole("img", { name: `${project.name} image 1` })).toBeVisible()
    await expect(gallery.getByRole("button", { name: `Open ${project.name} image viewer` })).toBeVisible()
  })

  test("lists the unit types with their beds, baths, size, price and availability", async ({ page, request }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    await expect(page.getByRole("heading", { level: 2, name: "Unit Types & Pricing", exact: true })).toBeVisible()
    const table = page.getByRole("table", { name: "Unit types and prices" })
    await expect(table.getByRole("columnheader")).toHaveText(["Type", "Beds", "Baths", "Size", "Price", "Availability"])
    for (const unit of project.units) {
      const unitName = unit.type ?? unit.name ?? "Unit"
      const row = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: unitName, exact: true }) })
      await expect(row).toContainText(/৳\s*\d|On request/)
    }
  })

  test("describes the apartment and lists its amenities", async ({ page, request }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    const about = sectionOf(page, "About This Apartment")
    await expect(about).toBeVisible()
    // A description with "*" is split into labelled facts instead of a paragraph.
    if (project.description && !project.description.includes("*")) {
      await expect(about).toContainText(project.description.replace(/\s+/g, " ").slice(0, 60))
    }

    const amenities = sectionOf(page, "Amenities")
    await expect(amenities).toBeVisible()
    await expect(amenities.getByRole("listitem")).toHaveText(project.amenities)
  })

  test("embeds a location map", async ({ page, request }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    const map = sectionOf(page, "Location Map").getByTitle(`${project.name} location map`)
    await expect(map).toBeVisible()
    await expect(map).toHaveAttribute("src", /^https:\/\/www\.google\.com\/maps\/embed/)
  })

  test("shows key facts, price range and developer beside the details", async ({ page, request }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    await expect(page.getByRole("heading", { level: 2, name: "Apartment at a glance", exact: true })).toBeVisible()
    const facts = page.getByRole("table", { name: "Key facts about this apartment" })
    await expect(facts.getByRole("rowheader", { name: "Address" })).toBeVisible()
    if (project.totalUnits != null) {
      await expect(facts.getByRole("row", { name: /Total units/ })).toContainText(String(project.totalUnits))
    }

    await expect(page.getByText("Price Range", { exact: true }).filter({ visible: true })).toBeVisible()
    await expect(page.getByText("Prices may vary per unit type and floor")).toBeVisible()
    if (project.developerName) {
      await expect(page.getByText(project.developerName, { exact: true }).filter({ visible: true })).toBeVisible()
    }
  })

  test("offers to enquire, WhatsApp and book a site visit", async ({ page }) => {
    await open(page, DETAIL_PATH)

    const card = enquiryCard(page)
    await expect(card.getByRole("heading", { level: 3, name: "Enquire About This Apartment" })).toBeVisible()
    await expect(card.getByRole("button", { name: "Send an enquiry" })).toBeVisible()
    await expect(card.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\//)
    await expect(card.getByRole("link", { name: "Book Site Visit" })).toHaveAttribute(
      "href",
      `/consultation?project=${DETAIL_SLUG}`,
    )
  })

  test("opens the enquiry form, pre-filled with the apartment, without sending anything", async ({ page, request }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    const sendAnEnquiry = enquiryCard(page).getByRole("button", { name: "Send an enquiry" })
    await hydrated(sendAnEnquiry)
    await sendAnEnquiry.click()

    const dialog = page.getByRole("dialog", { name: "Enquire about this apartment" })
    await expect(dialog).toBeVisible()
    for (const field of ["Your name", "Phone", "Email", "Message"]) {
      await expect(dialog.getByLabel(field)).toBeVisible()
    }
    await expect(dialog.getByLabel("Message")).toHaveValue(new RegExp(project.name))
    await expect(dialog.getByRole("button", { name: "Send enquiry" })).toBeEnabled()

    // Closed, never submitted: this is the owner's real inbox.
    await dialog.getByRole("button", { name: "Close" }).click()
    await expect(dialog).toBeHidden()
  })

  test("breadcrumb leads back to the apartments list", async ({ page, request }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(crumbs.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("href", "/")
    await expect(crumbs.getByText(project.name)).toBeVisible()
    await crumbs.getByRole("link", { name: "Apartments", exact: true }).click()

    await expect(page).toHaveURL((url) => url.pathname === LIST_PATH)
    await expect(mainHeading(page)).toBeVisible()
  })
})

// ── On a phone ─────────────────────────────────────────────────────────────────────────────────
// Phones get their own layout: filters in a bottom sheet, the sections as accordions and a
// floating contact bar.

test.describe("apartments on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test("filters and sort open in a sheet and reorder the list", async ({ page }) => {
    await open(page, LIST_PATH)

    const filters = page.getByRole("button", { name: /^Filters/ })
    await expect(cardsIn(page).first()).toBeVisible()
    await hydrated(filters)
    await filters.click()

    const sheet = page.getByRole("dialog", { name: "Filters" })
    await expect(sheet).toBeVisible()
    await sheet.getByRole("combobox", { name: "Sort by" }).selectOption({ label: "Price: low to high" })
    await expect(page).toHaveURL((url) => url.searchParams.get("sort") === "priceFrom:asc")

    await sheet.getByRole("button", { name: "Show apartments" }).click()
    await expect(sheet).toBeHidden()
    await expectListedInOrder(page, "price-asc")
  })

  test("detail page starts with the unit types open and opens the other sections on tap", { tag: "@counts-view" }, async ({
    page,
    request,
  }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    const units = sectionOf(page, "Unit Types & Pricing")
    await expect(units).toHaveAttribute("open", "")
    for (const unit of project.units) {
      await expect(units.getByRole("heading", { level: 3, name: unit.type ?? unit.name ?? "Unit", exact: true })).toBeVisible()
    }

    const amenities = sectionOf(page, "Amenities")
    await expect(amenities).not.toHaveAttribute("open", "")
    const amenitiesHeading = page.getByRole("heading", { level: 2, name: "Amenities", exact: true })
    await hydrated(amenitiesHeading)
    await amenitiesHeading.click()
    await expect(amenities).toHaveAttribute("open", "")
    await expect(amenities.getByRole("listitem")).toHaveText(project.amenities)
  })

  test("detail page keeps a contact bar on screen that opens the enquiry form without sending it", { tag: "@counts-view" }, async ({
    page,
    request,
  }) => {
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    const bar = page.getByRole("region", { name: `Contact about ${project.name}` })
    await expect(bar).toBeVisible()
    const enquire = bar.getByRole("button", { name: "Enquire", exact: true })
    await hydrated(enquire)
    await enquire.click()

    const dialog = page.getByRole("dialog", { name: "Enquire about this apartment" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel("Message")).toHaveValue(new RegExp(project.name))
    // Closed, never submitted: this is the owner's real inbox.
    await dialog.getByRole("button", { name: "Close" }).click()
    await expect(dialog).toBeHidden()
  })
})

// A browser tab, bookmark or search result has to tell one apartment page from another (WCAG 2.4.2).
test.describe("apartment page titles", () => {
  test("the listing's browser tab says it shows apartments", { tag: "@known-bug" }, async ({ page }) => {
    test.fail(true, KNOWN_BUG.apartmentsTitle)
    await open(page, LIST_PATH)

    await expect(page).toHaveTitle(/apartments/i, { timeout: 5_000 })
  })

  test("an apartment's browser tab carries its name", { tag: ["@known-bug", "@counts-view"] }, async ({ page, request }) => {
    test.fail(true, KNOWN_BUG.apartmentsTitle)
    const project = await apiProject(request, DETAIL_SLUG)
    await open(page, DETAIL_PATH)

    await expect.poll(() => page.title(), { message: "the page title", timeout: 5_000 }).toContain(project.name)
  })
})

test.describe("apartment that does not exist", () => {
  // Next streams its not-found page; depending on the version the document answers 200 or 404.
  test.use({ allowedErrors: [/\/apartments\/no-such-apartment.*-> 404/] })

  test("shows the page-not-found message instead of an apartment", async ({ page }) => {
    await open(page, `${LIST_PATH}/no-such-apartment-e2e`)

    await expect(page.getByRole("heading", { name: /could not be found/i })).toBeVisible()
    await expect(page.getByRole("button", { name: "Send an enquiry" })).toHaveCount(0)
  })
})
