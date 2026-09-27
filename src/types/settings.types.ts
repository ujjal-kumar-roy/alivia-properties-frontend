/** Singleton site-settings row (backend: `SiteSettings` model). */
export type SiteSettings = {
  id: string
  siteName: string
  contactEmail: string
  phone: string
  updatedAt: string
}

/** PATCH /settings body — mirrors the backend `UpdateSettingsDto` (all optional). */
export type UpdateSiteSettingsInput = {
  siteName?: string
  contactEmail?: string
  phone?: string
}
