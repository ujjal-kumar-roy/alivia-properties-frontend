import type { Inquiry, InquiryStatus, InquiryType } from "@/types/inquiry.types"
import { httpClient, type Paginated } from "./http-client"

export type InquiryQueryParams = {
  page?: number
  limit?: number
  status?: string
  type?: string
  search?: string
  sort?: string
}

type BackendInquiry = {
  id: string
  type: string
  status: string
  property?: { id: string; title: string; slug?: string } | null
  propertyId?: string | null
  propertyTitle?: string | null
  project?: { id: string; name: string; slug?: string } | null
  projectId?: string | null
  projectName?: string | null
  name: string
  email: string
  phone: string
  message: string
  reply?: string | null
  sellerId?: string | null
  buyerId?: string | null
  createdAt: string
  repliedAt?: string | null
}

function toBackendQuery(params: InquiryQueryParams): Record<string, string | number | undefined> {
  return {
    ...params,
    status: params.status ? params.status.toUpperCase() : undefined,
    type: params.type ? params.type.toUpperCase() : undefined,
  }
}

function toInquiry(i: BackendInquiry): Inquiry {
  return {
    id: i.id,
    type: i.type.toLowerCase() as InquiryType,
    status: i.status.toLowerCase() as InquiryStatus,
    propertyId: i.propertyId ?? i.property?.id ?? undefined,
    propertyTitle: i.propertyTitle ?? i.property?.title ?? undefined,
    propertySlug: i.property?.slug ?? undefined,
    projectId: i.projectId ?? i.project?.id ?? undefined,
    projectName: i.projectName ?? i.project?.name ?? undefined,
    projectSlug: i.project?.slug ?? undefined,
    name: i.name,
    email: i.email,
    phone: i.phone,
    message: i.message,
    reply: i.reply ?? undefined,
    sellerId: i.sellerId ?? undefined,
    buyerId: i.buyerId ?? undefined,
    createdAt: i.createdAt,
    repliedAt: i.repliedAt ?? undefined,
  }
}

export const inquiriesService = {
  async list(
    params: InquiryQueryParams = {},
    token?: string,
  ): Promise<Paginated<Inquiry>> {
    const res = await httpClient.paginated<BackendInquiry>("/inquiries", {
      query: toBackendQuery(params),
      token,
      cache: "no-store",
    })
    return { ...res, data: res.data.map(toInquiry) }
  },

  async detail(id: string, token?: string): Promise<Inquiry> {
    const res = await httpClient.get<BackendInquiry>(`/inquiries/${id}`, {
      token,
      cache: "no-store",
    })
    return toInquiry(res)
  },

  async create(payload: unknown, token?: string): Promise<Inquiry> {
    const res = await httpClient.post<BackendInquiry>("/inquiries", payload, { token })
    return toInquiry(res)
  },

  async update(
    id: string,
    payload: { status?: InquiryStatus; reply?: string },
    token?: string,
  ): Promise<Inquiry> {
    const res = await httpClient.patch<BackendInquiry>(
      `/inquiries/${id}`,
      {
        ...payload,
        status: payload.status?.toUpperCase(),
      },
      { token },
    )
    return toInquiry(res)
  },
}

export async function getInquiries(
  params: InquiryQueryParams = {},
): Promise<Paginated<Inquiry>> {
  const session = await (await import("@/auth")).auth()
  const token = session?.accessToken
  try {
    return await inquiriesService.list(params, token)
  } catch (err) {
    // Don't let a failed fetch masquerade as "no inquiries" — surface the reason
    // in the server log so an auth/network error is diagnosable instead of
    // silently rendering an empty list.
    console.error(
      `[getInquiries] failed to load inquiries (type=${params.type ?? "all"}, token=${token ? "present" : "missing"}):`,
      err instanceof Error ? err.message : err,
    )
    return {
      data: [],
      meta: { page: 1, limit: params.limit ?? 10, total: 0, totalPages: 0 },
    }
  }
}

export async function createInquiry(payload: unknown): Promise<Inquiry> {
  const session = await (await import("@/auth")).auth()
  return inquiriesService.create(payload, session?.accessToken)
}

export async function getInquiry(id: string): Promise<Inquiry> {
  const session = await (await import("@/auth")).auth()
  return inquiriesService.detail(id, session?.accessToken)
}
