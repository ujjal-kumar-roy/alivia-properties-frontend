import type {
  Property,
  PropertyPurpose,
  PropertyQueryParams,
  PropertyStatus,
  PropertyType,
} from "@/types/property.types"
import { httpClient, type Paginated } from "./http-client"

export type { PropertyQueryParams } from "@/types/property.types"

const BASE = "/properties"

// Backend Prisma enums are uppercase; frontend uses lowercase. Normalize on the way out.
function toBackendQuery(params: PropertyQueryParams): Record<string, string | number | boolean | undefined> {
  const q: Record<string, string | number | boolean | undefined> = { ...params }
  if (typeof q.status === "string") q.status = q.status.toUpperCase()
  if (typeof q.purpose === "string") q.purpose = q.purpose.toUpperCase()
  if (typeof q.type === "string") q.type = q.type.toUpperCase()
  return q
}

// Backend ships richer Property shape; we flatten + lowercase enums here so the
// UI consumes a stable shape regardless of backend evolution.
type BackendImage = { url: string } | string
type BackendProperty = Omit<Property, "images"> & {
  images: BackendImage[]
  panorama?: { url: string } | null
  seller?: { id: string; name: string; phone?: string; avatar?: string; avatarUrl?: string | null; isVerified?: boolean; whatsApp?: string }
}

function imageUrl(i: BackendImage): string {
  return typeof i === "string" ? i : i.url
}

// Derive the storage object key from a public URL (e.g.
// "http://host:9000/bucket/2026/06/uuid.jpg" → "2026/06/uuid.jpg"). The key is
// required by the backend ImageRef shape; the `url` is what the app renders.
function keyFromUrl(url: string): string {
  try {
    const segments = new URL(url).pathname.replace(/^\/+/, "").split("/")
    return segments.length > 1 ? segments.slice(1).join("/") : segments.join("/")
  } catch {
    return url
  }
}

// The create/edit form holds enums in lowercase, images as plain URL strings,
// and a few contact fields the Property model doesn't store. Map all of that to
// the backend write contract: uppercase enums, images as ordered ImageRef
// objects (index 0 = cover), videos as URL strings, contact fields dropped.
function toWritePayload(payload: unknown): Record<string, unknown> {
  const { contactName, contactPhone, whatsApp, images, type, purpose, videos, panorama, ...rest } =
    (payload ?? {}) as Record<string, unknown>
  void contactName
  void contactPhone
  void whatsApp

  const urls = Array.isArray(images) ? (images as string[]) : []
  // The form holds the panorama as a 0-or-1 entry URL array; the backend expects
  // a single ImageRef object (or null to clear it).
  const panoramaUrl = Array.isArray(panorama) ? (panorama as string[])[0] : undefined
  return {
    ...rest,
    ...(typeof type === "string" ? { type: type.toUpperCase() } : {}),
    ...(typeof purpose === "string" ? { purpose: purpose.toUpperCase() } : {}),
    images: urls.map((url, i) => ({
      key: keyFromUrl(url),
      url,
      isCover: i === 0,
      order: i,
    })),
    videos: Array.isArray(videos) ? (videos as string[]) : [],
    panorama: panoramaUrl ? { key: keyFromUrl(panoramaUrl), url: panoramaUrl } : null,
  }
}

function toFrontendProperty(p: BackendProperty): Property {
  return {
    ...p,
    images: Array.isArray(p.images) ? p.images.map(imageUrl) : [],
    videos: Array.isArray(p.videos) ? p.videos : [],
    panoramaUrl: p.panorama?.url ?? undefined,
    status: (typeof p.status === "string" ? p.status.toLowerCase() : p.status) as PropertyStatus,
    purpose: (typeof p.purpose === "string" ? p.purpose.toLowerCase() : p.purpose) as PropertyPurpose,
    type: (typeof p.type === "string" ? p.type.toLowerCase() : p.type) as PropertyType,
    sellerName: p.sellerName ?? p.seller?.name ?? "Seller",
    sellerPhone: p.sellerPhone ?? p.seller?.phone ?? "",
    sellerAvatar: p.sellerAvatar ?? p.seller?.avatarUrl ?? p.seller?.avatar ?? undefined,
    sellerWhatsApp: p.sellerWhatsApp ?? p.seller?.whatsApp,
    sellerVerified: p.sellerVerified ?? p.seller?.isVerified ?? false,
    sellerId: p.sellerId ?? p.seller?.id,
    facilities: p.facilities ?? [],
    viewCount: p.viewCount ?? 0,
    createdAt: p.createdAt ?? new Date().toISOString(),
  }
}

export const propertiesService = {
  async list(params: PropertyQueryParams = {}, token?: string): Promise<Paginated<Property>> {
    const res = await httpClient.paginated<BackendProperty>(BASE, {
      query: toBackendQuery(params),
      token,
    })
    return { ...res, data: res.data.map(toFrontendProperty) }
  },
  async bySlug(slug: string): Promise<Property> {
    const p = await httpClient.get<BackendProperty>(`${BASE}/${slug}`)
    return toFrontendProperty(p)
  },
  async byId(id: string, token?: string): Promise<Property> {
    const p = await httpClient.get<BackendProperty>(`${BASE}/id/${id}`, { token })
    return toFrontendProperty(p)
  },
  create(payload: unknown, token?: string): Promise<Property> {
    return httpClient
      .post<BackendProperty>(BASE, toWritePayload(payload), { token })
      .then(toFrontendProperty)
  },
  update(id: string, payload: unknown, token?: string): Promise<Property> {
    return httpClient
      .patch<BackendProperty>(`${BASE}/${id}`, toWritePayload(payload), { token })
      .then(toFrontendProperty)
  },
  remove(id: string, token?: string): Promise<void> {
    return httpClient.delete<void>(`${BASE}/${id}`, { token })
  },
  saved(params: { page?: number; limit?: number } = {}, token?: string): Promise<Paginated<Property>> {
    return httpClient
      .paginated<BackendProperty>(`${BASE}/me/saved`, { query: params, token })
      .then((res) => ({ ...res, data: res.data.map(toFrontendProperty) }))
  },
  save(id: string, token?: string): Promise<{ success: boolean }> {
    return httpClient.post<{ success: boolean }>(`${BASE}/${id}/save`, undefined, {
      token,
    })
  },
  unsave(id: string, token?: string): Promise<{ success: boolean }> {
    return httpClient.delete<{ success: boolean }>(`${BASE}/${id}/save`, {
      token,
    })
  },
  incrementView(id: string): Promise<{ id: string; viewCount: number }> {
    return httpClient.post<{ id: string; viewCount: number }>(`${BASE}/${id}/view`)
  },
  // ─── Admin moderation actions ───────────────────────────────────────────────
  approve(id: string, token?: string): Promise<Property> {
    return httpClient
      .post<BackendProperty>(`${BASE}/${id}/approve`, undefined, { token })
      .then(toFrontendProperty)
  },
  reject(id: string, reason: string, token?: string): Promise<Property> {
    return httpClient
      .post<BackendProperty>(`${BASE}/${id}/reject`, { reason }, { token })
      .then(toFrontendProperty)
  },
  feature(id: string, isFeatured: boolean, token?: string): Promise<Property> {
    return httpClient
      .post<BackendProperty>(`${BASE}/${id}/feature`, { isFeatured }, { token })
      .then(toFrontendProperty)
  },
  verify(id: string, isVerified: boolean, token?: string): Promise<Property> {
    return httpClient
      .post<BackendProperty>(`${BASE}/${id}/verify`, { isVerified }, { token })
      .then(toFrontendProperty)
  },
}

// Compatibility aliases used by existing pages
export const getProperties = propertiesService.list
export const getPropertyBySlug = propertiesService.bySlug
export const getPropertyById = propertiesService.byId
export const createProperty = propertiesService.create
export const updateProperty = propertiesService.update
export const deleteProperty = propertiesService.remove
export const getSavedProperties = propertiesService.saved
export const approveProperty = propertiesService.approve
export const rejectProperty = propertiesService.reject
export const featureProperty = propertiesService.feature
export const verifyProperty = propertiesService.verify

// `getProperty(slug)` wraps the lookup in `{ success, data }` for pages that
// branch on `res.success` before destructuring.
export async function getProperty(
  slug: string,
): Promise<{ success: true; data: Property } | { success: false; data: null }> {
  try {
    const data = await propertiesService.bySlug(slug)
    return { success: true, data }
  } catch {
    return { success: false, data: null }
  }
}
