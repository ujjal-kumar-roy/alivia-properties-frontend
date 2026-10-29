import fs from "node:fs"
import path from "node:path"
import { parseEnv } from "node:util"

/**
 * The three demo accounts the backend seed creates (alivia-properties-backend/prisma/seed.ts).
 *
 * Each value is looked up in this order, field by field:
 *   1. E2E_<ROLE>_EMAIL / E2E_<ROLE>_PASSWORD from the environment;
 *   2. SEED_<ROLE>_EMAIL / SEED_<ROLE>_PASSWORD from ../alivia-properties-backend/.env
 *      (parsed, never loaded into process.env; a missing file is fine);
 *   3. the seed's own defaults.
 *
 * Never print or log a password: not in test titles, error messages or console output.
 */

export const ROLES = ["buyer", "seller", "admin"] as const
export type Role = (typeof ROLES)[number]

export type Account = {
  role: Role
  email: string
  /** Not enumerable, so logging or diffing an Account never shows it. */
  readonly password: string
  /** Where the login form sends this role (src/utils/auth-helpers.ts). */
  dashboard: string
  /** The dashboard's main (h1) heading, for getByRole("heading", { level: 1, name }). */
  dashboardHeading: string | RegExp
}

const DASHBOARD_HEADINGS: Record<Role, string | RegExp> = {
  buyer: "Buyer Dashboard",
  seller: "Seller Dashboard",
  // The admin dashboard greets by time of day: "Good morning, Alivia 👋".
  admin: /^Good (morning|afternoon|evening),/,
}

const SEED_DEFAULTS: Record<Role, { email: string; password: string }> = {
  admin: { email: "admin@alivia.local", password: "Admin@12345" },
  seller: { email: "seller@alivia.local", password: "Seller@12345" },
  buyer: { email: "buyer@alivia.local", password: "Buyer@12345" },
}

function readBackendEnv(): NodeJS.Dict<string> {
  try {
    return parseEnv(fs.readFileSync(path.join(__dirname, "../../alivia-properties-backend/.env"), "utf8"))
  } catch {
    return {}
  }
}

const backendEnv = readBackendEnv()

export function account(role: Role): Account {
  const key = role.toUpperCase()
  const email =
    process.env[`E2E_${key}_EMAIL`] || backendEnv[`SEED_${key}_EMAIL`] || SEED_DEFAULTS[role].email
  const password =
    process.env[`E2E_${key}_PASSWORD`] || backendEnv[`SEED_${key}_PASSWORD`] || SEED_DEFAULTS[role].password

  const result = {
    role,
    email,
    dashboard: `/${role}/dashboard`,
    dashboardHeading: DASHBOARD_HEADINGS[role],
  } as Account
  Object.defineProperty(result, "password", { value: password, enumerable: false })
  return result
}

/** The saved login (Playwright storage state) the setup project writes for each role: e2e/.auth/<role>.json. */
export function authFile(role: Role): string {
  return path.join(__dirname, ".auth", `${role}.json`)
}
