import type { Role } from "./accounts"
import { expect, test, type ApiClient, type ApiResponse } from "./fixtures"
import { getJson } from "./helpers"

/*
 * Black-box tests of the NestJS API, with no browser: `request` for anonymous calls and `apiAs(role)` for
 * signed-in ones (a Bearer client built from the setup's saved login; nothing here ever calls /auth/login,
 * which allows 5 attempts a minute for the whole machine).
 *
 * Paths are relative to the API root, http://localhost:3001/api/v1/, so they have no leading slash.
 *
 * Data safety: the API runs on the owner's real dev database. Every call below is a read, except the
 * saved-listing round trip, which unsaves what it saved in `finally`.
 */

// ─── Shapes: only the fields these tests read ─────────────────────────────────────────────────────────────

type Row = Record<string, unknown>
type Meta = { page: number; limit: number; total: number; totalPages: number }
type Listing<T = Row> = { data: T[]; meta: Meta }
type Item<T = Row> = { data: T }
type Property = { id: string; slug: string; status: string; favoriteCount: number }
type Quote = {
  id: string
  name: string
  email: string
  company: string | null
  deliveryLocation: string | null
  buyerId: string | null
  assignedTo: string | null
  supplier: { ownerId: string | null } | null
}
type ErrorBody = { statusCode: number; message: string | string[]; error?: string; path: string; timestamp: string }

/** Listings anyone may browse; PENDING and REJECTED ones are for their seller and admins. */
const PUBLIC_STATUSES = ["APPROVED", "VERIFIED", "FEATURED"]

/** The listing the buyer UI spec saves and unsaves. The round trip below must never touch it. */
const UI_ROUND_TRIP_SLUG = "4-bed-apartment-for-sale-in-khalishpur-khalishpur"

// ─── Requests ─────────────────────────────────────────────────────────────────────────────────────────────

type Method = "get" | "post" | "delete"

/** Sends one request and returns the response, whatever its status. A 429 means the API runs with its default throttle. */
function send(api: ApiClient, method: Method, path: string, headers?: Record<string, string>): Promise<ApiResponse> {
  return api[method](path, { headers })
}

async function expectStatus(response: ApiResponse, status: number) {
  if (response.status() === status) return
  const body = (await response.text()).slice(0, 300)
  throw new Error(`${response.url()} answered ${response.status()}, expected ${status}: ${body}`)
}

async function expectOk(response: ApiResponse) {
  if (response.ok()) return
  const body = (await response.text()).slice(0, 300)
  throw new Error(`${response.url()} answered ${response.status()}: ${body}`)
}

/** The signed-in user's id. */
async function whoAmI(api: ApiClient): Promise<string> {
  return (await getJson<Item<{ id: string }>>(api, "auth/me")).data.id
}

/** How many items `path` lists for this client (the `meta.total` of a one-item page). */
async function countOf(api: ApiClient, path: string): Promise<number> {
  return (await getJson<Listing>(api, `${path}${path.includes("?") ? "&" : "?"}limit=1`)).meta.total
}

// ─── Assertions ───────────────────────────────────────────────────────────────────────────────────────────

const REASONS: Record<number, string> = { 400: "Bad Request", 403: "Forbidden", 404: "Not Found" }

/** The error contract: exactly { statusCode, message, error, path, timestamp }, with no stack trace or internals. */
async function expectError(response: ApiResponse, status: 400 | 403 | 404, message: string | string[] | RegExp) {
  await expectStatus(response, status)
  const body = (await response.json()) as ErrorBody
  expect(Object.keys(body).sort()).toEqual(["error", "message", "path", "statusCode", "timestamp"])
  expect(body.statusCode).toBe(status)
  expect(body.error).toBe(REASONS[status])
  if (message instanceof RegExp) expect(String(body.message)).toMatch(message)
  else expect(body.message).toEqual(message)
  expectErrorMetadata(body, response)
}

/** A 401 carries no `error` label (it comes straight from the auth guard), but the rest of the contract holds. */
async function expectUnauthorized(response: ApiResponse) {
  await expectStatus(response, 401)
  const body = (await response.json()) as ErrorBody
  expect(body).toMatchObject({ statusCode: 401, message: "Unauthorized" })
  expect(body).not.toHaveProperty("data")
  expectErrorMetadata(body, response)
}

function expectErrorMetadata(body: ErrorBody, response: ApiResponse) {
  const url = new URL(response.url())
  expect(body.path).toBe(url.pathname + url.search)
  expect(Math.abs(Date.now() - Date.parse(body.timestamp)), "timestamp is not a recent ISO date").toBeLessThan(300_000)
}

/** The list envelope: { data: [...], meta: { page, limit, total, totalPages } } and nothing else. */
function expectListEnvelope(body: Listing, { page = 1, limit = 20 } = {}) {
  expect(Object.keys(body).sort()).toEqual(["data", "meta"])
  expect(Array.isArray(body.data)).toBe(true)
  expect(body.meta).toEqual({ page, limit, total: expect.any(Number), totalPages: expect.any(Number) })
  expect(body.data.length).toBeLessThanOrEqual(limit)
  expect(body.meta.total).toBeGreaterThanOrEqual(body.data.length)
  expect(body.meta.totalPages).toBe(Math.max(1, Math.ceil(body.meta.total / limit)))
}

/** `values` (nulls aside) run in ascending or descending order, as MongoDB sorts them: strings by code point. */
function expectOrdered(values: unknown[], direction: "asc" | "desc", label: string) {
  const present = values.filter((value): value is number | string => value != null)
  const expected = [...present].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  if (direction === "desc") expected.reverse()
  expect(present, label).toEqual(expected)
}

// ─── Public reads ─────────────────────────────────────────────────────────────────────────────────────────

test.describe("public reads", () => {
  test("GET /health reports the API and its database as ok", async ({ request }) => {
    const { data } = await getJson<Item<{ status: string; mongo: string; uptime: number; timestamp: string }>>(
      request,
      "health",
    )

    expect(data).toMatchObject({ status: "ok", mongo: "ok" })
    expect(data.uptime).toBeGreaterThan(0)
    expect(Number.isNaN(Date.parse(data.timestamp))).toBe(false)
  })

  // The dev database holds properties, projects, marketplace products and suppliers. A list that
  // answers 200 with no items would hide an outage behind an empty page, so these must not be empty.
  for (const list of ["properties", "projects", "marketplace/products", "marketplace/suppliers"]) {
    test(`GET /${list} lists items in the { data, meta } envelope, newest first`, async ({ request }) => {
      const body = await getJson<Listing>(request, list)

      expectListEnvelope(body)
      expect(body.data.length).toBeGreaterThan(0)
      expectOrdered(body.data.map((row) => row.createdAt), "desc", `${list} is not newest first`)
    })

    test(`GET /${list} pages without repeating items`, async ({ request }) => {
      const first = await getJson<Listing>(request, `${list}?limit=5&page=1`)
      const second = await getJson<Listing>(request, `${list}?limit=5&page=2`)

      expectListEnvelope(first, { limit: 5 })
      expectListEnvelope(second, { page: 2, limit: 5 })
      const firstIds = first.data.map((row) => row.id)
      expect(second.data.length).toBeGreaterThan(0)
      expect(second.data.filter((row) => firstIds.includes(row.id))).toEqual([])
    })
  }

  test("GET /blog lists published articles in the { data, meta } envelope", async ({ request }) => {
    const body = await getJson<Listing<{ isPublished: boolean }>>(request, "blog")

    expectListEnvelope(body)
    expect(body.data.filter((article) => !article.isPublished)).toEqual([])
  })

  test("GET /marketplace/tree answers with the active departments in a { data } envelope", async ({ request }) => {
    type Department = { level: string; isActive: boolean; categories: unknown[] }
    const body = await getJson<Item<Department[]>>(request, "marketplace/tree")

    expect(Object.keys(body)).toEqual(["data"])
    expect(body.data.length).toBeGreaterThan(0)
    for (const department of body.data) {
      expect(department).toMatchObject({ level: "DEPARTMENT", isActive: true })
      expect(Array.isArray(department.categories)).toBe(true)
    }
    expect(body.data.some((department) => department.categories.length > 0)).toBe(true)
  })

  test("GET /hero-slides answers with the carousel slides in a { data } envelope", async ({ request }) => {
    const body = await getJson<Item<unknown[]>>(request, "hero-slides")

    expect(Object.keys(body)).toEqual(["data"])
    expect(Array.isArray(body.data)).toBe(true)
  })

  test("visitors never see listings that are not approved yet, even when they ask for them", async ({ request }) => {
    for (const status of ["PENDING", "REJECTED"]) {
      const { data } = await getJson<Listing<Property>>(request, `properties?status=${status}&limit=100`)

      expect(data.filter((property) => !PUBLIC_STATUSES.includes(property.status))).toEqual([])
    }
  })
})

// ─── Sorting ──────────────────────────────────────────────────────────────────────────────────────────────

test.describe("sorting", () => {
  // Each list answers only the sort fields it allows (`?sort=<field>:asc|desc`); the UI offers these.
  // (Every product's price is 0 in today's dev data, so the order of that one cannot be told apart yet;
  // the 200 and the non-empty list still count.)
  const ALLOWED_SORTS = {
    properties: ["createdAt", "price", "size"],
    projects: ["createdAt", "priceFrom", "name"],
    "marketplace/products": ["createdAt", "price", "name", "rating", "reviewCount"],
    "marketplace/suppliers": ["createdAt", "name", "rating", "reviewCount"],
  }

  for (const [list, fields] of Object.entries(ALLOWED_SORTS)) {
    for (const field of fields) {
      test(`GET /${list} sorts by ${field}, ascending and descending`, async ({ request }) => {
        for (const direction of ["asc", "desc"] as const) {
          const path = `${list}?sort=${field}:${direction}&limit=100`
          const { data } = await getJson<Listing>(request, path)

          // The marketplace pages show an empty list when this call fails, so the list must not be empty.
          expect(data.length, `${path} came back empty`).toBeGreaterThan(0)
          expectOrdered(data.map((row) => row[field]), direction, path)
        }
      })
    }
  }

  // Every list endpoint, public or signed-in. The signed-in ones are asked as a role that may read them.
  const SORTABLE_LISTS: Array<{ path: string; as?: Role }> = [
    { path: "properties" },
    { path: "projects" },
    { path: "marketplace/products" },
    { path: "marketplace/suppliers" },
    { path: "blog" },
    { path: "agents" },
    { path: "reviews" },
    { path: "qa" },
    { path: "properties/me/saved", as: "buyer" },
    { path: "bookings", as: "buyer" },
    { path: "inquiries", as: "buyer" },
    { path: "offers", as: "buyer" },
    { path: "notifications", as: "buyer" },
    { path: "marketplace/quotes", as: "buyer" },
    { path: "marketplace/seller/products", as: "seller" },
    { path: "users", as: "admin" },
    { path: "blog/admin", as: "admin" },
    { path: "marketplace/admin/products", as: "admin" },
    { path: "marketplace/admin/suppliers", as: "admin" },
  ]

  for (const { path, as } of SORTABLE_LISTS) {
    const title = `GET /${path} rejects an unknown sort field with 400${as ? ` (as ${as})` : ""}`
    test(title, async ({ request, apiAs }) => {
      const api = as ? await apiAs(as) : request

      const response = await send(api, "get", `${path}?sort=hackField:asc`)

      await expectError(response, 400, 'Cannot sort by "hackField"')
    })
  }

  test("GET /users will not sort by a secret field", async ({ apiAs }) => {
    const admin = await apiAs("admin")

    const response = await send(admin, "get", "users?sort=passwordHash:asc")

    await expectError(response, 400, 'Cannot sort by "passwordHash"')
  })

  test("a sort that only another list allows is rejected with 400", async ({ request }) => {
    const elsewhere = [
      ["properties", "name"],
      ["properties", "priceFrom"],
      ["projects", "price"],
      ["marketplace/suppliers", "price"],
      ["blog", "viewCount"],
    ]
    for (const [list, field] of elsewhere) {
      const response = await send(request, "get", `${list}?sort=${field}:asc`)

      await expectError(response, 400, `Cannot sort by "${field}"`)
    }
  })
})

// ─── Error contract ───────────────────────────────────────────────────────────────────────────────────────

test.describe("error contract", () => {
  test("GET /bookings/not-an-id answers 400 Invalid ID format (as buyer)", async ({ apiAs }) => {
    const buyer = await apiAs("buyer")

    await expectError(await send(buyer, "get", "bookings/not-an-id"), 400, "Invalid ID format")
  })

  test("GET /marketplace/suppliers/no-such-supplier answers 404 Supplier not found", async ({ request }) => {
    await expectError(await send(request, "get", "marketplace/suppliers/no-such-supplier"), 404, "Supplier not found")
  })

  for (const [path, message] of [
    ["properties/no-such-property", "Property not found"],
    ["projects/no-such-project", "Project not found"],
    ["blog/no-such-article", "Article not found"],
    ["marketplace/products/no-such-product", "Product not found"],
    ["agents/no-such-agent", "Agent not found"],
  ]) {
    test(`GET /${path} answers 404 ${message}`, async ({ request }) => {
      await expectError(await send(request, "get", path), 404, message)
    })
  }

  test("malformed paging answers 400 with the list of problems", async ({ request }) => {
    await expectError(await send(request, "get", "properties?limit=101"), 400, ["limit must not be greater than 100"])
    await expectError(await send(request, "get", "properties?limit=0"), 400, ["limit must not be less than 1"])
    await expectError(await send(request, "get", "properties?page=0"), 400, ["page must not be less than 1"])
  })

  test("a query parameter the list does not know answers 400", async ({ request }) => {
    await expectError(await send(request, "get", "properties?bogus=1"), 400, ["property bogus should not exist"])
  })
})

// ─── Authentication and role guards ───────────────────────────────────────────────────────────────────────

test.describe("authentication and role guards", () => {
  for (const path of [
    "auth/me",
    "users/me",
    "dashboard/buyer",
    "bookings",
    "inquiries",
    "offers",
    "marketplace/quotes",
    "properties/me/saved",
    "notifications",
  ]) {
    test(`GET /${path} answers 401 without a token`, async ({ request }) => {
      await expectUnauthorized(await send(request, "get", path))
    })
  }

  test("GET /users/me answers 401 for a token that is not valid", async ({ request }) => {
    const response = await send(request, "get", "users/me", { Authorization: "Bearer not-a-real-token" })

    await expectUnauthorized(response)
  })

  // Each row: a role asks for a route that belongs to another role. The first three are the ones the
  // product depends on; the rest are the other staff-only and role-only routes. All are reads.
  const FORBIDDEN: Array<{ as: Role; path: string }> = [
    { as: "buyer", path: "dashboard/admin" },
    { as: "seller", path: "dashboard/buyer" },
    { as: "buyer", path: "users" },
    { as: "buyer", path: "dashboard/seller" },
    { as: "seller", path: "dashboard/admin" },
    { as: "seller", path: "users" },
    { as: "buyer", path: "marketplace/admin/products" },
    { as: "buyer", path: "marketplace/admin/suppliers" },
    { as: "buyer", path: "marketplace/admin/categories" },
    { as: "buyer", path: "marketplace/seller/products" },
    { as: "buyer", path: "blog/admin" },
    { as: "buyer", path: "hero-slides/admin" },
    { as: "seller", path: "marketplace/admin/products" },
    { as: "seller", path: "marketplace/admin/suppliers" },
    { as: "seller", path: "blog/admin" },
    { as: "seller", path: "hero-slides/admin" },
    { as: "seller", path: "properties/me/saved" },
  ]

  for (const { as, path } of FORBIDDEN) {
    test(`GET /${path} answers 403 as ${as}`, async ({ apiAs }) => {
      const api = await apiAs(as)

      await expectError(await send(api, "get", path), 403, /^Requires one of: /)
    })
  }

  // The other side of the guards: the routes above are closed to the wrong role, not to everyone.
  const OPEN: Array<{ as: Role; path: string }> = [
    { as: "admin", path: "users" },
    { as: "admin", path: "dashboard/admin" },
    { as: "admin", path: "marketplace/admin/products" },
    { as: "admin", path: "marketplace/admin/suppliers" },
    { as: "admin", path: "marketplace/admin/categories" },
    { as: "admin", path: "blog/admin" },
    { as: "admin", path: "hero-slides/admin" },
    { as: "seller", path: "marketplace/seller/products" },
    { as: "seller", path: "marketplace/seller/suppliers" },
    { as: "buyer", path: "properties/me/saved" },
  ]

  for (const { as, path } of OPEN) {
    test(`GET /${path} answers 200 as ${as}`, async ({ apiAs }) => {
      const api = await apiAs(as)

      const body = await getJson<Item>(api, path)

      expect(body).toHaveProperty("data")
    })
  }

  for (const role of ["buyer", "seller", "admin"] as const) {
    test(`GET /auth/me answers with role ${role.toUpperCase()} for the saved ${role} login`, async ({ apiAs }) => {
      const api = await apiAs(role)

      const { data } = await getJson<Item<{ role: string }>>(api, "auth/me")

      expect(data.role).toBe(role.toUpperCase())
    })
  }

  test("no response carries an account's secrets", async ({ request, apiAs }) => {
    const SECRETS = ["passwordHash", "refreshTokenHash", "verificationToken", "passwordResetToken"]
    const keysOf = (value: unknown): string[] =>
      value && typeof value === "object"
        ? Object.entries(value).flatMap(([key, child]) => [key, ...keysOf(child)])
        : []
    const admin = await apiAs("admin")
    const buyer = await apiAs("buyer")

    const bodies = {
      "GET /properties (the seller inside each listing)": await getJson(request, "properties?limit=100"),
      "GET /marketplace/suppliers": await getJson(request, "marketplace/suppliers?limit=100"),
      "GET /auth/me": await getJson(buyer, "auth/me"),
      "GET /users": await getJson(admin, "users?limit=100"),
      "GET /marketplace/quotes (the buyer and the rep inside each quote)": await getJson(
        admin,
        "marketplace/quotes?limit=100",
      ),
    }

    for (const [call, body] of Object.entries(bodies)) {
      expect(keysOf(body).filter((key) => SECRETS.includes(key)), `${call} carries a secret`).toEqual([])
    }
  })
})

// ─── Scoping ──────────────────────────────────────────────────────────────────────────────────────────────

/** Whether a row belongs to the viewer `me`. */
type Owns = (row: Row, me: string) => boolean
const supplierOwner = (row: Row) => (row.supplier as { ownerId?: string | null } | null)?.ownerId

/** What each role may list: only the rows they are part of. Admins list everything. */
const SCOPED_LISTS: Record<string, { path: string; buyer: Owns; seller: Owns }> = {
  offers: {
    path: "offers",
    buyer: (row, me) => row.buyerId === me || row.sellerId === me,
    seller: (row, me) => row.buyerId === me || row.sellerId === me,
  },
  bookings: {
    path: "bookings",
    buyer: (row, me) => row.userId === me,
    seller: (row, me) => row.assignedTo === me,
  },
  inquiries: {
    path: "inquiries",
    buyer: (row, me) => row.buyerId === me,
    seller: (row, me) => row.sellerId === me,
  },
  "quote requests": {
    path: "marketplace/quotes",
    buyer: (row, me) => row.buyerId === me,
    seller: (row, me) => row.assignedTo === me || supplierOwner(row) === me,
  },
}

test.describe("scoping", () => {
  for (const [name, { path, ...owns }] of Object.entries(SCOPED_LISTS)) {
    for (const role of ["buyer", "seller"] as const) {
      const title = `${role} lists only the ${name} they are part of; admin lists at least as many`
      test(title, async ({ apiAs }, testInfo) => {
        const api = await apiAs(role)
        const admin = await apiAs("admin")
        const me = await whoAmI(api)

        const mine = await getJson<Listing>(api, `${path}?limit=100`)
        const everyone = await getJson<Listing>(admin, `${path}?limit=100`)

        // With no rows the checks below hold for any scoping; the report shows how many rows there were.
        testInfo.annotations.push({
          type: "rows",
          description: `${mine.meta.total} listed to the ${role}, ${everyone.meta.total} to admin`,
        })
        const outside = mine.data.filter((row) => !owns[role](row, me))
        expect(outside.map((row) => row.id), `${name} outside the ${role}'s scope`).toEqual([])
        expect(everyone.meta.total).toBeGreaterThanOrEqual(mine.meta.total)
      })
    }
  }

  // The search sits beside the scope, never in place of it: words that belong to someone else's quote
  // must not bring that quote back. Both viewers share one test, so the admin is asked once per term:
  // every route has a request budget that the other specs spend from too.
  test("quote search never reaches past a seller's or a buyer's own quotes, whatever the term", async ({
    apiAs,
  }, testInfo) => {
    const admin = await apiAs("admin")
    const viewers: Array<{ role: string; api: ApiClient; inScope: (quote: Quote) => boolean }> = []
    for (const role of ["seller", "buyer"] as const) {
      const api = await apiAs(role)
      const me = await whoAmI(api)
      const inScope = (quote: Quote) =>
        role === "buyer" ? quote.buyerId === me : quote.assignedTo === me || quote.supplier?.ownerId === me
      viewers.push({ role, api, inScope })
    }
    const all = (await getJson<Listing<Quote>>(admin, "marketplace/quotes?limit=100")).data

    // Each viewer's terms come from the quotes they may not see, so a leak would match them.
    // "a" matches nearly every quote.
    const wordsOf = (quotes: Quote[]) =>
      quotes
        .flatMap((quote) => [
          quote.name.split(/\s+/)[0],
          quote.email.split("@")[0],
          quote.company ?? "",
          (quote.deliveryLocation ?? "").split(",")[0],
        ])
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length >= 2)
    const terms = new Set(["a"])
    for (const { role, inScope } of viewers) {
      const outside = all.filter((quote) => !inScope(quote))
      testInfo.annotations.push({
        type: "rows",
        description: `${outside.length} of ${all.length} quotes lie outside the ${role}'s scope`,
      })
      for (const word of wordsOf(outside).slice(0, 2)) terms.add(word)
    }

    for (const term of terms) {
      const path = `marketplace/quotes?search=${encodeURIComponent(term)}&limit=100`
      const foundByAdmin = await getJson<Listing<Quote>>(admin, path)
      for (const { role, api, inScope } of viewers) {
        const found = await getJson<Listing<Quote>>(api, path)

        const leaked = found.data.filter((quote) => !inScope(quote))
        expect(leaked.map((quote) => quote.id), `quotes outside the ${role}'s scope found by "${term}"`).toEqual([])
        expect(foundByAdmin.meta.total, `admin finds fewer than the ${role} for "${term}"`).toBeGreaterThanOrEqual(
          found.meta.total,
        )
      }
    }
  })
})

// ─── Saved listings ───────────────────────────────────────────────────────────────────────────────────────

test.describe("saved listings", () => {
  test("a buyer's save counts once and an unsave counts once, however often it is repeated", async ({
    request,
    apiAs,
  }) => {
    const buyer = await apiAs("buyer")
    const savedIds = async () =>
      (await getJson<Listing<Property>>(buyer, "properties/me/saved?limit=100")).data.map((p) => p.id)
    const favoritesOf = async (slug: string) =>
      (await getJson<Item<Property>>(request, `properties/${slug}`)).data.favoriteCount

    // The oldest public listing that is neither the one the buyer UI spec uses nor already saved.
    const alreadySaved = await savedIds()
    const { data: listings } = await getJson<Listing<Property>>(request, "properties?sort=createdAt:asc&limit=100")
    const property = listings.find((p) => p.slug !== UI_ROUND_TRIP_SLUG && !alreadySaved.includes(p.id))
    if (!property) throw new Error("No public listing is free to save: every one is saved or is the UI spec's")
    const before = await favoritesOf(property.slug)

    try {
      for (const attempt of [1, 2]) {
        const saved = await send(buyer, "post", `properties/${property.id}/save`)
        await expectOk(saved)
        expect(await saved.json(), `save #${attempt}`).toEqual({ data: { success: true } })
      }
      expect((await savedIds()).filter((id) => id === property.id), "times the listing is saved").toHaveLength(1)
      expect(await favoritesOf(property.slug), "favoriteCount after saving twice").toBe(before + 1)

      for (const attempt of [1, 2]) {
        const removed = await send(buyer, "delete", `properties/${property.id}/save`)
        await expectOk(removed)
        expect(await removed.json(), `unsave #${attempt}`).toEqual({ data: { success: true } })
      }
      expect(await savedIds(), "saved listings after unsaving").not.toContain(property.id)
      expect(await favoritesOf(property.slug), "favoriteCount after unsaving twice").toBe(before)
    } finally {
      // Leave the buyer's saved list as it was found, whatever failed above. Unsaving is idempotent.
      await expectOk(await send(buyer, "delete", `properties/${property.id}/save`))
    }
  })
})

// ─── Dashboards ───────────────────────────────────────────────────────────────────────────────────────────

test.describe("dashboards", () => {
  /** Every key is a non-negative count; returns them as numbers. */
  const counts = (data: Row, keys: string[]): Record<string, number> => {
    for (const key of keys) {
      expect(data[key], `${key} is not a count`).toEqual(expect.any(Number))
      expect(data[key] as number).toBeGreaterThanOrEqual(0)
    }
    return Object.fromEntries(keys.map((key) => [key, data[key] as number]))
  }

  test("GET /dashboard/buyer answers with the buyer's counters, matching their lists", async ({ apiAs }) => {
    const buyer = await apiAs("buyer")

    const { data } = await getJson<Item>(buyer, "dashboard/buyer")

    const stats = counts(data, ["savedCount", "totalInquiries", "totalBookings"])
    expect(stats.totalInquiries).toBe(await countOf(buyer, "inquiries"))
    expect(stats.totalBookings).toBe(await countOf(buyer, "bookings"))
  })

  test("GET /dashboard/seller answers with the seller's counters, matching their lists", async ({ apiAs }) => {
    const seller = await apiAs("seller")
    const me = await whoAmI(seller)

    const { data } = await getJson<Item>(seller, "dashboard/seller")

    const stats = counts(data, [
      "totalListings",
      "activeListings",
      "pendingListings",
      "totalInquiries",
      "newInquiries",
      "totalBookings",
    ])
    expect(stats.activeListings + stats.pendingListings).toBeLessThanOrEqual(stats.totalListings)
    expect(stats.newInquiries).toBeLessThanOrEqual(stats.totalInquiries)
    // A seller listing their own properties sees every status, so that count is the dashboard's total.
    expect(stats.totalListings).toBe(await countOf(seller, `properties?sellerId=${me}`))
    expect(stats.totalInquiries).toBe(await countOf(seller, "inquiries"))
    expect(stats.totalBookings).toBe(await countOf(seller, "bookings"))
  })

  test("GET /dashboard/admin answers with the platform counters, charts and a recentActivity feed", async ({
    request,
    apiAs,
  }) => {
    const admin = await apiAs("admin")

    const { data } = await getJson<Item>(admin, "dashboard/admin")

    const stats = counts(data, [
      "totalProperties",
      "pendingListings",
      "approvedListings",
      "verifiedListings",
      "featuredListings",
      "totalUsers",
      "totalSellers",
      "totalBuyers",
      "totalInquiries",
      "newInquiries",
      "totalBookings",
      "pendingBookings",
      "totalProjects",
    ])
    expect(stats.pendingListings + stats.approvedListings + stats.verifiedListings).toBeLessThanOrEqual(
      stats.totalProperties,
    )
    expect(stats.totalSellers + stats.totalBuyers).toBeLessThanOrEqual(stats.totalUsers)
    expect(stats.newInquiries).toBeLessThanOrEqual(stats.totalInquiries)
    expect(stats.pendingBookings).toBeLessThanOrEqual(stats.totalBookings)

    const label = { label: expect.any(String) }
    for (const chart of ["monthlyListings", "monthlyBookings"]) {
      const points = data[chart] as unknown[]
      expect(points.length, `${chart} has no months`).toBeGreaterThan(0)
      for (const point of points) expect(point).toEqual({ ...label, value: expect.any(Number) })
    }
    for (const point of data.inquiryByType as unknown[]) expect(point).toEqual({ ...label, value: expect.any(Number) })
    const quarters = data.propertyStatusByQuarter as unknown[]
    expect(quarters.length).toBeGreaterThan(0)
    for (const point of quarters) {
      const count = expect.any(Number)
      expect(point).toEqual({ ...label, pending: count, approved: count, verified: count })
    }

    const activity = data.recentActivity as Array<{ timestamp: string }>
    expect(Array.isArray(activity)).toBe(true)
    for (const item of activity) {
      const text = expect.any(String)
      expect(item).toMatchObject({ id: text, type: text, title: text, description: text, timestamp: text })
    }
    expectOrdered(activity.map((item) => item.timestamp), "desc", "recentActivity is not newest first")

    // What admin counts agrees with the public lists: every project, and at least every public property.
    expect(stats.totalProjects).toBe(await countOf(request, "projects"))
    expect(stats.totalProperties).toBeGreaterThanOrEqual(await countOf(request, "properties"))
  })
})
