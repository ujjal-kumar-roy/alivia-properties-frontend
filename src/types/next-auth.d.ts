import type { UserRole } from "@/types/user.types"
// Side-effect imports so TS picks up the module declarations below.
import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    role: UserRole
    isVerified: boolean
    accessToken?: string
    refreshToken?: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: UserRole
      isVerified: boolean
    }
    accessToken?: string
    // Set by the jwt callback in src/auth.ts when a silent refresh fails.
    // Nothing currently reacts to this (no new UI) — it's surfaced so client
    // code can check `session.error` later without another auth.ts change.
    error?: "RefreshAccessTokenError"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    isVerified?: boolean
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: "RefreshAccessTokenError"
  }
}
