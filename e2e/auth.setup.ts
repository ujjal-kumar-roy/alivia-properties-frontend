import fs from "node:fs"
import { setTimeout as sleep } from "node:timers/promises"
import { test as setup, expect, type Page } from "@playwright/test"
import { ROLES, account, authFile, type Role } from "./accounts"

// Logs each role in through the real /login page and saves e2e/.auth/<role>.json.
// The API allows 5 logins per minute for the whole machine, so: one role at a time, reuse
// recent logins, and on a rate-limit refusal wait a minute and retry once.

const REUSE_LOGINS_FOR_MS = 10 * 60_000

setup.describe.configure({ mode: "default" })

const isFresh = (file: string) =>
  fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < REUSE_LOGINS_FOR_MS

for (const role of ROLES) {
  setup(`log in as ${role}`, async ({ page }) => {
    setup.setTimeout(300_000)
    const file = authFile(role)

    if (isFresh(file)) {
      console.log(`[setup] ${role}: reusing the login saved less than 10 minutes ago`)
      return
    }

    let refusal = await logIn(page, role)
    if (refusal && /too many|throttl/i.test(refusal)) {
      console.log(`[setup] ${role}: login rate-limited, retrying once in 60 s`)
      await sleep(60_000)
      if (isFresh(file)) return // a parallel run logged in meanwhile
      refusal = await logIn(page, role)
    }
    if (refusal) throw new Error(`Login as ${role} was refused: ${refusal}`)

    // Write, then rename: a parallel run never reads a half-written file.
    await page.context().storageState({ path: `${file}.${process.pid}.tmp` })
    fs.renameSync(`${file}.${process.pid}.tmp`, file)
  })
}

/** Submits the login form. Resolves null once the role's dashboard renders, or with the form's error text. */
async function logIn(page: Page, role: Role): Promise<string | null> {
  const user = account(role)
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 60_000 })

  // Wait until React has hydrated the form (attached its props). A form submitted before that is
  // sent by the browser itself, as a GET with the password in the URL, and so in server logs.
  const form = page.locator("form")
  await expect
    .poll(() => form.evaluate(isHydrated, undefined, { timeout: 5_000 }).catch(() => false), {
      message: "wait for React to hydrate the login form",
      timeout: 60_000,
    })
    .toBe(true)

  await page.getByLabel("Email Address").fill(user.email)

  const password = page.getByLabel("Password", { exact: true })
  await password.evaluate(typeInto, user.password, { timeout: 15_000 })
  try {
    await page.getByRole("button", { name: "Sign In" }).click({ timeout: 15_000 })
  } finally {
    // The form has read the password by now. Clear the field, so no failure snapshot can show it.
    // If the field is already gone (the dashboard loaded), there is nothing to clear.
    await password.evaluate(typeInto, "", { timeout: 5_000 }).catch(() => {})
  }

  // The form either sends the user to their dashboard or shows a role="alert" banner above itself.
  // `next dev` may compile the dashboard first.
  const dashboardHeading = page.getByRole("heading", { level: 1, name: user.dashboardHeading })
  const formError = form.locator("..").getByRole("alert").first()
  await expect(dashboardHeading.or(formError).first()).toBeVisible({ timeout: 60_000 })
  if (await formError.isVisible()) return (await formError.innerText()).trim()

  await expect(page).toHaveURL(user.dashboard)
  return null
}

/** Runs in the page: React keeps an element's props on it under a `__reactProps$…` key once hydrated. */
function isHydrated(element: Element) {
  return Object.keys(element).some((key) => key.startsWith("__reactProps$"))
}

/**
 * Runs in the page: sets an input's value the way a paste does, so React sees the change. Used for
 * the password instead of fill() or type(), whose values Playwright writes into step titles (and so
 * into the HTML report).
 */
function typeInto(input: HTMLInputElement, text: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, text)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}
