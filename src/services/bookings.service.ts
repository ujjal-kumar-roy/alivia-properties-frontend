import type { Booking, BookingStatus, ConsultationType } from "@/types/booking.types"
import { httpClient, type Paginated } from "./http-client"

export type BookingQueryParams = {
  page?: number
  limit?: number
  status?: string
  search?: string
  sort?: string
}

type BackendBooking = {
  id: string
  consultationType: string
  status: string
  project?: { id: string; name: string; slug?: string } | null
  projectId?: string | null
  projectName?: string | null
  property?: { id: string; title: string; slug?: string } | null
  propertyId?: string | null
  propertyTitle?: string | null
  name: string
  email: string
  phone: string
  preferredDate: string
  preferredTime: string
  message?: string | null
  userId?: string | null
  assignedTo?: string | null
  createdAt: string
  confirmedAt?: string | null
  cancelledAt?: string | null
  completedAt?: string | null
}

function toBooking(b: BackendBooking): Booking {
  return {
    id: b.id,
    consultationType: (b.consultationType.toLowerCase().replace(/_/g, "-")) as ConsultationType,
    status: b.status.toLowerCase() as BookingStatus,
    projectId: b.projectId ?? b.project?.id ?? undefined,
    projectName: b.projectName ?? b.project?.name ?? undefined,
    projectSlug: b.project?.slug ?? undefined,
    propertyId: b.propertyId ?? b.property?.id ?? undefined,
    propertyTitle: b.propertyTitle ?? b.property?.title ?? undefined,
    propertySlug: b.property?.slug ?? undefined,
    name: b.name,
    email: b.email,
    phone: b.phone,
    preferredDate: b.preferredDate,
    preferredTime: b.preferredTime,
    message: b.message ?? undefined,
    userId: b.userId ?? undefined,
    assignedTo: b.assignedTo ?? undefined,
    createdAt: b.createdAt,
    confirmedAt: b.confirmedAt ?? undefined,
    cancelledAt: b.cancelledAt ?? undefined,
    completedAt: b.completedAt ?? undefined,
  }
}

export const bookingsService = {
  async list(
    params: BookingQueryParams = {},
    token?: string,
  ): Promise<Paginated<Booking>> {
    const res = await httpClient.paginated<BackendBooking>("/bookings", {
      query: params as Record<string, string | number | undefined>,
      token,
      cache: "no-store",
    })
    return { ...res, data: res.data.map(toBooking) }
  },

  async create(payload: unknown, token?: string): Promise<Booking> {
    const res = await httpClient.post<BackendBooking>("/bookings", payload, { token })
    return toBooking(res)
  },

  async detail(id: string, token?: string): Promise<Booking> {
    const res = await httpClient.get<BackendBooking>(`/bookings/${id}`, {
      token,
      cache: "no-store",
    })
    return toBooking(res)
  },

  async confirm(id: string, token?: string): Promise<Booking> {
    const res = await httpClient.patch<BackendBooking>(`/bookings/${id}/confirm`, undefined, {
      token,
    })
    return toBooking(res)
  },

  async cancel(id: string, token?: string): Promise<Booking> {
    const res = await httpClient.patch<BackendBooking>(`/bookings/${id}/cancel`, undefined, {
      token,
    })
    return toBooking(res)
  },

  async complete(id: string, token?: string): Promise<Booking> {
    const res = await httpClient.patch<BackendBooking>(`/bookings/${id}/complete`, undefined, {
      token,
    })
    return toBooking(res)
  },
}

export async function getBookings(
  params: BookingQueryParams = {},
): Promise<Paginated<Booking>> {
  const session = await (await import("@/auth")).auth()
  const token = session?.accessToken
  try {
    return await bookingsService.list(params, token)
  } catch {
    return {
      data: [],
      meta: { page: 1, limit: params.limit ?? 10, total: 0, totalPages: 0 },
    }
  }
}

export async function createBooking(payload: unknown): Promise<Booking> {
  const session = await (await import("@/auth")).auth()
  return bookingsService.create(payload, session?.accessToken)
}

export async function getBooking(id: string): Promise<Booking> {
  const session = await (await import("@/auth")).auth()
  return bookingsService.detail(id, session?.accessToken)
}
