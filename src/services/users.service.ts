import { auth } from "@/auth"
import { ApiError, httpClient, type Paginated } from "./http-client"
import { normalizeRole, type User } from "@/types/user.types"

async function sessionToken(): Promise<string | undefined> {
  const session = await auth()
  return session?.accessToken
}

type BackendUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  avatar?: string | null
  role: string
  isVerified: boolean
  createdAt?: string
  updatedAt?: string
}

function toUser<T extends User = User>(u: BackendUser): T {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    avatar: u.avatar ?? undefined,
    role: normalizeRole(u.role),
    isVerified: u.isVerified,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  } as T
}

export const usersService = {
  async list(
    params: {
      page?: number
      limit?: number
      role?: string
      search?: string
      verified?: string
    } = {},
    token?: string,
  ): Promise<Paginated<User>> {
    const res = await httpClient.paginated<BackendUser>("/users", {
      query: params as Record<string, string | number | undefined>,
      token,
    })
    return { ...res, data: res.data.map(u => toUser(u)) }
  },

  byId(id: string, token?: string): Promise<User> {
    return httpClient
      .get<BackendUser>(`/users/${id}`, { token })
      .then(toUser)
  },

  me(token?: string): Promise<User> {
    return httpClient
      .get<BackendUser>("/users/me", { token })
      .then(toUser)
  },

  update(id: string, payload: unknown, token?: string): Promise<User> {
    return httpClient
      .patch<BackendUser>(`/users/${id}`, payload, { token })
      .then(toUser)
  },

  // Admin: change a user's role. `role` is the backend enum value
  // (ADMIN | SELLER | BUYER, uppercase) — callers pass the frontend
  // lowercase UserRole and this normalizes it.
  updateRole(id: string, role: string, token?: string): Promise<User> {
    return httpClient
      .patch<BackendUser>(`/users/${id}/role`, { role: role.toUpperCase() }, { token })
      .then(toUser)
  },

  // Admin: flip a user's verification flag.
  updateVerification(id: string, isVerified: boolean, token?: string): Promise<User> {
    return httpClient
      .patch<BackendUser>(`/users/${id}/verify`, { isVerified }, { token })
      .then(toUser)
  },

  updateMe(payload: unknown, token?: string): Promise<User> {
    return httpClient
      .patch<BackendUser>("/users/me", payload, { token })
      .then(toUser)
  },
}

export function loadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Your admin session has expired. Please sign out and sign back in to load users."
    }
    return `Couldn't load users (HTTP ${err.status}). ${err.message}`
  }
  return "Couldn't load users. Make sure the API server is running."
}

export async function getMe(): Promise<User> {
  return usersService.me(await sessionToken())
}
