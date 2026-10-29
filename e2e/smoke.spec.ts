import { ROLES, account, type Role } from "./accounts"
import { test, expect } from "./fixtures"
import { open } from "./helpers"

// One smoke test that every browser project runs once (public, buyer, seller, admin), only to
// prove the harness: the project's storage state, the error collector, and the landing page.
// It also warms up each signed-in dashboard, which `next dev` compiles on its first hit.

const isRole = (name: string): name is Role => (ROLES as readonly string[]).includes(name)

test("landing page renders its main heading", { tag: "@smoke" }, async ({ page }, testInfo) => {
  const project = testInfo.project.name
  const landing = isRole(project)
    ? { path: account(project).dashboard, heading: account(project).dashboardHeading }
    : { path: "/", heading: /\S/ }

  await open(page, landing.path)

  await expect(page).toHaveURL(landing.path)
  await expect(page.getByRole("heading", { level: 1, name: landing.heading })).toBeVisible()
})
