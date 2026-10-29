import type { Page } from "@playwright/test"
import { siteConfig } from "../src/config/site.config"
import { expect, test, type ApiClient } from "./fixtures"
import { KNOWN_BUG, getJson, hydrated, open } from "./helpers"

// Public content pages: what a signed-out visitor reads. The home page, the company and legal pages,
// the lead forms, the moving checklist, the sign-in pages, the blog, the agents page, and the
// redirect that keeps signed-out visitors out of the dashboards.
//
// Data safety (this is the owner's real data): every test only reads. The forms on /contact-us,
// /consultation, /login, /register and /forgot-password are looked at but never submitted, not even
// empty, so no inquiry, booking, login attempt or account is created. Two things write on their own
// and are expected: opening the blog article records one view (the Next server pings
// POST /blog/:slug/view, which the browser cannot stub; the test carries the tag @counts-view), and the
// moving checklist keeps its ticks in the test browser's localStorage.
//
// Several of these pages turn an API error into an empty state, or into a built-in fallback list, on
// the Next server, where the error collector cannot see it. So the tests assert the data itself (a
// product count, a flagship card, the article) rather than only "nothing went wrong", and for the one
// legitimate empty state (/agents) they ask the API first.

// Each test loads its own page and nothing carries over, so the file can run in parallel.
test.describe.configure({ mode: "parallel" })

const { contact } = siteConfig

const ARTICLE = {
  slug: "first-time-home-buyer-guide-bangladesh",
  title: "First-Time Home Buyer Guide in Bangladesh",
  // The body is "# Introduction" followed by one short paragraph.
  heading: "Introduction",
  text: "Buying your first home is exciting",
}

// ── Reading the page ───────────────────────────────────────────────────────────────────────────

/** The page's one h1. */
const pageTitle = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name })

/** The page body between the site header and the footer: the target of the "Skip to main content" link. */
const body = (page: Page) => page.locator("#main-content")

// ── Home ───────────────────────────────────────────────────────────────────────────────────────

test.describe("home page", () => {
  test("opens on the hero with search and department shortcuts", async ({ page }) => {
    await open(page, "/")

    await expect(page).toHaveTitle(/^Marketplace/)
    // The headline belongs to the slide on show, and the carousel moves on by itself: only check one is there.
    const hero = page.getByRole("region", { name: "Alivia Properties highlights" })
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(/\S/)
    await expect(page.getByRole("searchbox", { name: "Search marketplace categories" })).toBeVisible()

    const departments = page.getByRole("navigation", { name: "Marketplace departments" })
    await expect(departments.getByRole("link", { name: "Browse all apartments" })).toHaveAttribute("href", "/apartments")
    const firstDepartment = departments.getByRole("link").filter({ hasNotText: "Browse all apartments" }).first()
    await expect(firstDepartment).toHaveAttribute("href", /^#department-/)
  })

  test("lists the live departments with category tiles that show product counts", async ({ page }) => {
    await open(page, "/")

    const categories = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { level: 2, name: "Build by Category" }) })
    await expect(categories.getByRole("heading", { level: 3 }).first()).toBeVisible()

    // A product count comes only from the API. The page's built-in fallback categories have none,
    // so this fails when the categories request fails and the fallback is shown instead.
    const counted = categories.getByRole("link", { name: /\b\d+ products?$/ }).first()
    await expect(counted).toBeVisible()
    await expect(counted).toHaveAttribute("href", /^\/marketplace\/category\/[\w-]+$/)
  })

  test("shows the live verified-seller count and the flagship apartments", async ({ page }) => {
    await open(page, "/")

    // "25 verified sellers" appears only when the suppliers request answered; otherwise the card keeps a generic line.
    await expect(page.getByText(/\d+ verified sellers/)).toBeVisible()

    const flagship = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { level: 2, name: /find your next landmark/i }) })
    const firstCard = flagship.getByRole("article").first()
    await expect(firstCard).toBeVisible()
    await expect(firstCard.getByRole("heading", { level: 3 })).toHaveText(/\S/)
    await expect(firstCard.getByRole("link").first()).toHaveAttribute("href", /^\/apartments\/[\w-]+$/)
    await expect(flagship.getByText("Apartments are being prepared")).toHaveCount(0)
  })

  const GUIDED_STARTS = [
    { intent: "Buy an apartment", answer: "Under ৳50L", cta: "Show apartments", href: "/apartments?maxPrice=5000000" },
    { intent: "Buy or rent a property", answer: "Rent", cta: "Show properties", href: "/properties?purpose=rent" },
  ]

  for (const { intent, answer, cta, href } of GUIDED_STARTS) {
    test(`guided start: "${intent}" then "${answer}" offers a link to ${href}`, async ({ page }) => {
      await open(page, "/")

      const guide = page.getByRole("region", { name: "Find what you need" })
      for (const name of ["Buy an apartment", "Buy or rent a property", "Source building materials", "Invest with Alivia"]) {
        await expect(guide.getByRole("button", { name, exact: true })).toBeVisible()
      }

      const firstChoice = guide.getByRole("button", { name: intent, exact: true })
      await hydrated(firstChoice)
      await firstChoice.click()
      const secondChoice = guide.getByRole("button", { name: answer, exact: true })
      await secondChoice.click()

      await expect(secondChoice).toHaveAttribute("aria-pressed", "true")
      await expect(guide.getByRole("link", { name: cta })).toHaveAttribute("href", href)
    })
  }
})

// ── Company pages ──────────────────────────────────────────────────────────────────────────────

test.describe("company pages", () => {
  test("about page tells the company story", async ({ page }) => {
    await open(page, "/about-us")

    await expect(pageTitle(page, "Building Trust Since 2011")).toBeVisible()
    const main = body(page)
    for (const name of ["Our Vision", "Our Mission", "A Word from Our Founder", "Milestones That Shaped Us"]) {
      await expect(main.getByRole("heading", { level: 2, name })).toBeVisible()
    }
    await expect(main.getByText(siteConfig.founder.name)).toBeVisible()
    await expect(main.getByText(siteConfig.founder.title)).toBeVisible()
    await expect(main.getByRole("heading", { level: 3, name: "Company Founded" })).toBeVisible()
    for (const label of ["Apartments Delivered", "Happy Families", "Years Experience", "Active Listings"]) {
      await expect(main.getByText(label, { exact: true })).toBeVisible()
    }
  })

  test("site pages are framed by the shared header and footer", async ({ page }) => {
    await open(page, "/about-us")

    const nav = page.getByRole("navigation", { name: "Main navigation" })
    for (const [name, href] of [
      ["Home", "/"],
      ["Marketplace", "/marketplace"],
      ["Apartments", "/apartments"],
      ["Company", "/about-us"],
    ]) {
      await expect(nav.getByRole("link", { name })).toHaveAttribute("href", href)
    }
    await expect(page.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login")

    const footer = page.getByRole("contentinfo")
    await expect(footer.getByRole("link", { name: contact.phone })).toHaveAttribute("href", `tel:${contact.phoneRaw}`)
    await expect(footer.getByRole("link", { name: contact.email })).toHaveAttribute("href", `mailto:${contact.email}`)
    await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy")
    await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms")
  })

  test("contact page lists how to reach Alivia and offers an unsent message form", async ({ page }) => {
    await open(page, "/contact-us")

    await expect(pageTitle(page, "Contact Us")).toBeVisible()
    const main = body(page)
    await expect(main.getByRole("link", { name: contact.phone })).toHaveAttribute("href", `tel:${contact.phoneRaw}`)
    await expect(main.getByRole("link", { name: contact.email })).toHaveAttribute("href", `mailto:${contact.email}`)
    await expect(main.getByRole("link", { name: contact.emailAlt })).toHaveAttribute("href", `mailto:${contact.emailAlt}`)
    await expect(main.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", `https://wa.me/${contact.whatsApp}`)
    await expect(main.getByText(contact.officeHours)).toBeVisible()
    // Exact: the map placeholder below repeats the address inside a longer line.
    await expect(main.getByText(contact.address, { exact: true })).toBeVisible()

    // The form is only looked at. Sending it would file a real inquiry.
    await expect(main.getByRole("heading", { level: 2, name: "Send Us a Message" })).toBeVisible()
    for (const name of ["Full Name", "Phone", "Email Address", "Subject", "Message"]) {
      await expect(main.getByRole("textbox", { name })).toBeEditable()
    }
    await expect(main.getByRole("button", { name: "Send Message" })).toBeEnabled()
  })

  test("consultation page offers the booking form without submitting it", async ({ page }) => {
    await open(page, "/consultation")

    await expect(pageTitle(page, "Free Real Estate Consultation")).toBeVisible()
    const main = body(page)
    await expect(main.getByText("30 minutes (free)")).toBeVisible()
    await expect(main.getByRole("link", { name: contact.phone })).toHaveAttribute("href", `tel:${contact.phoneRaw}`)
    await expect(main.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", `https://wa.me/${contact.whatsApp}`)
    await expect(main.getByText(contact.officeHours)).toBeVisible()

    // The form is only looked at. Sending it would book a real consultation.
    await expect(main.getByRole("heading", { level: 2, name: "Schedule Your Consultation" })).toBeVisible()
    for (const name of ["Full Name", "Phone", "Email", "Preferred date", "Message"]) {
      await expect(main.getByRole("textbox", { name })).toBeEditable()
    }
    await expect(main.getByRole("combobox", { name: "Consultation type" }).getByRole("option")).toHaveText([
      "Select type…",
      "Buying a property",
      "Investment advice",
      "Apartment inquiry",
      "Site visit request",
    ])
    await expect(main.getByRole("combobox", { name: "Preferred time" })).toContainText("10:00 AM")
    await expect(main.getByRole("button", { name: "Book Free Consultation" })).toBeEnabled()
  })
})

// ── Legal pages ────────────────────────────────────────────────────────────────────────────────

const LEGAL_DOCUMENTS = [
  {
    path: "/privacy",
    title: "Privacy Policy",
    other: { link: /Read our Terms of Service/, path: "/terms", title: "Terms of Service" },
  },
  {
    path: "/terms",
    title: "Terms of Service",
    other: { link: /Read our Privacy Policy/, path: "/privacy", title: "Privacy Policy" },
  },
]

const outlineOf = (page: Page) => page.getByRole("navigation", { name: "Sections on this page" })

for (const doc of LEGAL_DOCUMENTS) {
  test.describe(`${doc.title} page`, () => {
    test("shows its title, update date and print button", async ({ page }) => {
      await open(page, doc.path)

      await expect(page).toHaveTitle(new RegExp(`^${doc.title}`))
      await expect(pageTitle(page, doc.title)).toBeVisible()
      await expect(page.getByText(/^Last updated [A-Z][a-z]+ \d{1,2}, \d{4}$/)).toBeVisible()
      await expect(page.getByRole("button", { name: "Save / print this page" })).toBeVisible()
    })

    test("has an outline whose every entry leads to a section with that title", async ({ page }) => {
      await open(page, doc.path)

      const entries = outlineOf(page).getByRole("link")
      await expect(entries.first()).toBeVisible()
      const outline = await entries.evaluateAll((links) =>
        links.map((link) => ({
          id: (link.getAttribute("href") ?? "").replace(/^#/, ""),
          // The link reads "<number> <title>".
          label: (link.textContent ?? "").replace(/^\s*\d+\s*/, "").trim(),
        })),
      )
      expect(outline.length, "entries in the outline").toBeGreaterThan(5)

      for (const { id, label } of outline) {
        await expect(
          page.locator(`section[id="${id}"]`).getByRole("heading", { level: 2 }),
          `the section for the outline entry "${label}"`,
        ).toContainText(label)
      }
    })

    test("jumps to a section from the outline", async ({ page }) => {
      await open(page, doc.path)

      await outlineOf(page).getByRole("link", { name: /Contact Us$/ }).click()

      await expect(page).toHaveURL(/#contact$/)
      await expect(
        page.locator('section[id="contact"]').getByRole("heading", { level: 2, name: "Contact Us" }),
      ).toBeInViewport()
    })

    test(`links across to the ${doc.other.title}`, async ({ page }) => {
      await open(page, doc.path)

      await page.getByRole("link", { name: doc.other.link }).click()

      await expect(page).toHaveURL(doc.other.path)
      await expect(pageTitle(page, doc.other.title)).toBeVisible()
    })
  })
}

// ── Moving checklist ───────────────────────────────────────────────────────────────────────────

test.describe("moving checklist", () => {
  test("lists 16 tasks over 8 weeks with none ticked", async ({ page }) => {
    await open(page, "/moving-checklist")

    await expect(page).toHaveTitle(/^Moving Checklist/)
    await expect(pageTitle(page, "Moving checklist")).toBeVisible()
    await expect(page.getByText("16 tasks across 8 weeks")).toBeVisible()

    const main = body(page)
    await expect(main.getByRole("heading", { level: 2, name: /^Week \d$/ })).toHaveCount(8)
    await expect(main.getByRole("checkbox")).toHaveCount(16)
    await expect(main.getByRole("checkbox", { checked: true })).toHaveCount(0)
    await expect(main.getByText("0 of 16 done")).toBeVisible()
    await expect(main.getByRole("progressbar", { name: "Moving checklist progress" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    )
  })

  test("ticking a task updates the progress and is remembered after a reload", async ({ page }) => {
    await open(page, "/moving-checklist")

    const week1 = page.getByRole("region", { name: "Week 1" })
    const task = week1.getByRole("checkbox").first()
    const progress = page.getByRole("progressbar", { name: "Moving checklist progress" })

    await hydrated(task)
    await task.click()

    await expect(task).toBeChecked()
    await expect(page.getByText("1 of 16 done")).toBeVisible()
    await expect(week1.getByText("1/2")).toBeVisible()
    await expect(progress).toHaveAttribute("aria-valuenow", "6")

    // The ticks live in the browser's localStorage, which a reload keeps.
    await page.reload()
    await expect(task).toBeChecked()
    await expect(page.getByText("1 of 16 done")).toBeVisible()
  })
})

// ── Account pages: shown, never submitted ──────────────────────────────────────────────────────

test.describe("account pages", () => {
  test("login page shows the sign-in form", async ({ page }) => {
    await open(page, "/login")

    await expect(pageTitle(page, "Welcome back")).toBeVisible()
    await expect(page.getByLabel("Email Address")).toBeEditable()
    const password = page.getByLabel("Password", { exact: true })
    await expect(password).toBeEditable()
    await expect(password).toHaveAttribute("type", "password")
    await expect(page.getByRole("button", { name: "Sign In" })).toBeEnabled()
    await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password")
    await expect(page.getByRole("link", { name: "Register" })).toHaveAttribute("href", "/register")

    // The eye button only reveals what is typed. It never submits the form.
    const show = page.getByRole("button", { name: "Show password" })
    await hydrated(show)
    await show.click()
    await expect(password).toHaveAttribute("type", "text")
    await expect(page.getByRole("button", { name: "Hide password" })).toBeVisible()
  })

  test("register page shows the sign-up form with buyer preselected", async ({ page }) => {
    await open(page, "/register")

    await expect(pageTitle(page, "Create an account")).toBeVisible()
    for (const name of ["Full Name", "Email Address", "Phone Number", "Confirm Password"]) {
      await expect(page.getByLabel(name)).toBeEditable()
    }
    await expect(page.getByLabel("Password", { exact: true })).toBeEditable()
    await expect(page.getByRole("checkbox", { name: /I agree to the Terms of Service and Privacy Policy/ })).not.toBeChecked()
    await expect(page.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms")
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy")
    await expect(page.getByRole("button", { name: "Create Account" })).toBeEnabled()
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login")

    // Picking the other account type is the only change; nothing is sent.
    const buyer = page.getByRole("radio", { name: /^buyer/ })
    const seller = page.getByRole("radio", { name: /^seller/ })
    await expect(buyer).toBeChecked()
    await hydrated(seller)
    await seller.click()
    await expect(seller).toBeChecked()
    await expect(buyer).not.toBeChecked()
  })

  test("forgot-password page shows the reset form", async ({ page }) => {
    await open(page, "/forgot-password")

    await expect(pageTitle(page, "Reset your password")).toBeVisible()
    await expect(page.getByLabel("Email Address")).toBeEditable()
    await expect(page.getByRole("button", { name: "Send Reset Link" })).toBeEnabled()
    await expect(page.getByRole("link", { name: "Back to Login" })).toHaveAttribute("href", "/login")
  })

  test("the sign-in form can never put the password in the address bar", { tag: "@known-bug" }, async ({ page }) => {
    test.fail(true, KNOWN_BUG.loginFormGet)
    await open(page, "/login")

    // A click on Sign In before React hydrates the form makes the browser send the form itself, the way its
    // `method` says. A GET puts every named field, the password too, in the URL, and so in server logs.
    const password = page.getByLabel("Password", { exact: true })
    const nativeSubmit = await password.evaluate((input: HTMLInputElement) => {
      const form = input.form
      if (!form || form.method !== "get" || !input.name) return null
      if ((form.getAttribute("action") ?? "").startsWith("javascript:")) return null
      return `GET ${new URL(form.action).pathname}?…&${input.name}=…`
    })
    expect(nativeSubmit, "what a submit before hydration sends").toBeNull()
  })
})

// ── Blog ───────────────────────────────────────────────────────────────────────────────────────

test.describe("blog", () => {
  test("lists the published article", async ({ page }) => {
    await open(page, "/blog")

    await expect(pageTitle(page, "Real Estate Insights")).toBeVisible()
    // The page shows an empty state when the blog request fails, so look for the article itself.
    const card = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { level: 2, name: ARTICLE.title }) })
    await expect(card).toBeVisible()
    await expect(card.getByRole("link")).toHaveAttribute("href", `/blog/${ARTICLE.slug}`)
    await expect(page.getByText("Articles are on the way")).toHaveCount(0)
  })

  test("narrows the list to a category chip's articles", async ({ page }) => {
    await open(page, "/blog")

    const chips = page.getByRole("navigation", { name: "Article categories" })
    await expect(chips.getByRole("link", { name: "All", exact: true })).toHaveAttribute("aria-current", "page")
    const chip = chips.getByRole("link").filter({ hasNotText: /^All$/ }).first()
    const category = (await chip.innerText()).trim()

    await chip.click()

    await expect(page).toHaveURL(/\/blog\?category=/)
    await expect(chips.getByRole("link", { name: category, exact: true })).toHaveAttribute("aria-current", "page")
    // A chip exists only because some article is in that category.
    await expect(page.getByRole("article").first()).toBeVisible()
  })

  test("shows an empty state for a category without articles", async ({ page }) => {
    await open(page, "/blog?category=no-such-category")

    await expect(pageTitle(page, "Real Estate Insights")).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "Nothing here yet" })).toBeVisible()
    await expect(page.getByText("No articles found for this category yet.")).toBeVisible()
    await expect(page.getByRole("link", { name: "See all articles" })).toHaveAttribute("href", "/blog")
    await expect(page.getByRole("article")).toHaveCount(0)
  })

  test("article page shows the title and body", { tag: "@counts-view" }, async ({ page }) => {
    await open(page, `/blog/${ARTICLE.slug}`)

    await expect(pageTitle(page, ARTICLE.title)).toBeVisible()
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" })
    await expect(crumbs.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/")
    await expect(crumbs.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog")

    const article = page.getByRole("article").filter({ hasText: ARTICLE.text })
    await expect(article.getByRole("heading", { level: 2, name: ARTICLE.heading })).toBeVisible()
    await expect(article).toContainText(ARTICLE.text)
  })

  test("shows the not-found page for an unknown article", async ({ page }) => {
    await open(page, "/blog/no-such-article")

    await expect(pageTitle(page, "404")).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "This page could not be found." })).toBeVisible()
  })
})

// ── Agents ─────────────────────────────────────────────────────────────────────────────────────

/** How many agents the API lists. /agents shows the same empty state for "none" and for an API error, so ask the API. */
async function listedAgents(request: ApiClient): Promise<number> {
  return (await getJson<{ meta: { total: number } }>(request, "agents")).meta.total
}

test.describe("agents page", () => {
  test("shows the empty state while no agent is listed", async ({ page, request }) => {
    const total = await listedAgents(request)

    await open(page, "/agents")

    await expect(page).toHaveTitle(/^Verified Agents/)
    await expect(pageTitle(page, "Verified property professionals")).toBeVisible()
    const emptyState = page.getByText("Our verified agents are joining soon.")
    if (total === 0) {
      await expect(emptyState).toBeVisible()
      await expect(body(page).getByRole("link", { name: "Browse properties" })).toHaveAttribute("href", "/properties")
      await expect(body(page).getByRole("link", { name: "Talk to us" })).toHaveAttribute("href", "/contact-us")
    } else {
      // Agents exist now, so the page must list them instead of apologising.
      await expect(emptyState).toHaveCount(0)
      await expect(page.getByRole("article").first()).toBeVisible()
    }
  })
})

// ── Signed-out visitors ────────────────────────────────────────────────────────────────────────

const toLogin = (callbackPath: string) => (url: URL) =>
  url.pathname === "/login" && url.searchParams.get("callbackUrl") === callbackPath

test.describe("signed-out visitors", () => {
  for (const path of ["/buyer/dashboard", "/seller/dashboard", "/admin/dashboard"]) {
    test(`${path} sends them to the login page`, async ({ page }) => {
      await open(page, path)

      await expect(page).toHaveURL(toLogin(path))
      await expect(pageTitle(page, "Welcome back")).toBeVisible()
    })
  }

  test("deeper dashboard pages are guarded too", async ({ page }) => {
    for (const path of ["/buyer/saved-properties", "/seller/properties/create", "/admin/users"]) {
      await open(page, path)

      await expect(page, `signed out on ${path}`).toHaveURL(toLogin(path))
      await expect(pageTitle(page, "Welcome back")).toBeVisible()
    }
  })
})
