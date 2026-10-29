import { test, expect } from "./fixtures"
import { getData } from "./helpers"

// Proves the `api` project: no browser, a Bearer client built from the setup's saved login.

test("GET auth/me as the buyer returns the buyer", { tag: "@smoke" }, async ({ apiAs }) => {
  const me = await getData<{ role: string }>(await apiAs("buyer"), "auth/me")

  expect(me.role).toBe("BUYER")
})
