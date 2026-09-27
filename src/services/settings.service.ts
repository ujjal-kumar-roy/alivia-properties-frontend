import type { SiteSettings, UpdateSiteSettingsInput } from "@/types/settings.types"
import { httpClient } from "./http-client"

const BASE = "/settings"

export const settingsService = {
  /** Admin: singleton site settings (backend seeds defaults on first read). */
  get(token?: string): Promise<SiteSettings> {
    return httpClient.get<SiteSettings>(BASE, { token, cache: "no-store" })
  },
  /** Admin: update the singleton site settings row. */
  update(values: UpdateSiteSettingsInput, token?: string): Promise<SiteSettings> {
    return httpClient.patch<SiteSettings>(BASE, values, { token })
  },
}

// Compatibility aliases used by callers — same naming convention as the other services.
export const getSettings = settingsService.get
export const updateSettings = settingsService.update
