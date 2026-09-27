import { normalizeRole, type UserRole } from "@/types/user.types";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3001/api/v1";

type BackendLoginResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
    isVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
};

type LoginResult =
  | { ok: true; data: BackendLoginResponse }
  | { ok: false; status: number; message: string };

function parseBackendAuthPayload(json: unknown): BackendLoginResponse | null {
  if (!json || typeof json !== "object") return null;

  const payload =
    "data" in json
      ? (json as { data?: BackendLoginResponse }).data
      : (json as BackendLoginResponse);

  if (!payload?.user || !payload.accessToken || !payload.refreshToken) return null;
  return payload;
}

/* ────────────────────────────────────────────────────────────────────────
 * Silent refresh-token flow.
 *
 * This used to be disabled: the backend rotates the refresh token on every
 * use (single-use, rotating), and multiple requests (middleware, RSC session
 * lookups, client polling/focus refetch) could race to refresh at once — the
 * loser presented an already-rotated token, got "refresh token mismatch",
 * and the jwt() callback throwing wiped the whole NextAuth session, logging
 * the user out minutes into their visit.
 *
 * That race is now handled at the source: the backend added a short (~10s)
 * reuse-tolerance grace period to refresh-token rotation (see
 * alivia-properties-backend/src/modules/auth/refresh-token-grace.util.ts and
 * AuthService.issueTokens). A request that presents a token that was JUST
 * superseded by a concurrent request gets back the SAME new pair that
 * request produced, instead of an error — so near-simultaneous refreshes
 * from the same login are now idempotent. This file also keeps an in-process
 * de-dupe (`refreshAccessTokenDeduped` below) as a second, defense-in-depth
 * layer on top of that, but the backend grace window is what actually fixes
 * the race.
 *
 * NOTE on token lifetime: the task this was built against assumed a 15-
 * minute backend access-token lifetime. As implemented right now,
 * `alivia-properties-backend/.env` still has `JWT_ACCESS_EXPIRES_IN=30d`
 * (see `src/config/configuration.ts` default too) — i.e. access tokens are
 * currently long-lived, not 15 minutes. Rather than hardcode an expiry
 * assumption that's currently false (and would cause near-constant,
 * unnecessary refresh calls — the exact kind of concurrent-refresh pressure
 * this whole feature exists to survive), `getAccessTokenExpiresAt` below
 * decodes the real `exp` claim out of the access token JWT we're actually
 * holding. That's correct today at 30d and stays correct unchanged if the
 * backend's access-token lifetime is later shortened to 15m.
 *
 * Failure handling is deliberately soft: refresh failure never throws inside
 * jwt() (that's what wiped sessions before). It sets `token.error =
 * "RefreshAccessTokenError"` and otherwise leaves the token's existing
 * accessToken/refreshToken untouched — so worst case, a still-valid access
 * token keeps working until it actually expires, and only then do calls
 * start 401ing, same as if there were no refresh flow at all. `token.error`
 * is surfaced on `session.error` for client code to react to later; nothing
 * currently reacts to it (no new UI added here).
 * ──────────────────────────────────────────────────────────────────────── */

type RefreshResult =
  | { ok: true; data: BackendLoginResponse }
  | { ok: false; message: string };

// Fallback only — used if we can't decode the access token's own `exp` claim
// (shouldn't happen with a token we just received from our own backend, but
// never trust that blindly). Deliberately short: an early, harmless refresh
// is fine, silently overrunning a real expiry is not.
const FALLBACK_ACCESS_TOKEN_TTL_MS = 14 * 60 * 1000;

// Refresh this long before the access token's real expiry, so a request
// that starts just under the wire doesn't race the token's own deadline.
const REFRESH_SKEW_MS = 60 * 1000;

function getAccessTokenExpiresAt(accessToken: string): number {
  try {
    const [, rawPayload] = accessToken.split(".");
    if (!rawPayload) return Date.now() + FALLBACK_ACCESS_TOKEN_TTL_MS;

    const normalized = rawPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
      exp?: number;
    };

    if (typeof parsed.exp === "number") return parsed.exp * 1000;
  } catch {}

  return Date.now() + FALLBACK_ACCESS_TOKEN_TTL_MS;
}

async function refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return { ok: false, message: "Network error while refreshing session." };
  }

  if (!res.ok) {
    return { ok: false, message: "Session expired. Please sign in again." };
  }

  const payload = parseBackendAuthPayload(await res.json());
  if (!payload) {
    return { ok: false, message: "Invalid refresh response from server." };
  }

  return { ok: true, data: payload };
}

// In-process de-dupe: if two jwt() invocations in the same server instance
// race with the *same* stale refresh token, they share one in-flight
// request instead of both hitting the backend. This is a secondary safety
// net — the backend's own grace period (see header comment) is what makes
// refreshing safe even when this doesn't catch a race (e.g. across separate
// server instances/lambdas).
let inFlightRefresh: { token: string; promise: Promise<RefreshResult> } | null = null;

function refreshAccessTokenDeduped(refreshToken: string): Promise<RefreshResult> {
  if (inFlightRefresh && inFlightRefresh.token === refreshToken) {
    return inFlightRefresh.promise;
  }

  const promise = refreshAccessToken(refreshToken).finally(() => {
    if (inFlightRefresh?.token === refreshToken) inFlightRefresh = null;
  });
  inFlightRefresh = { token: refreshToken, promise };
  return promise;
}

// Auth.js v5 forwards `code` to the client on signIn({ redirect: false }).
class BackendLoginError extends CredentialsSignin {
  code: string;
  constructor(message: string) {
    super(message);
    this.code = message;
  }
}

async function loginAgainstBackend(
  email: string,
  password: string,
): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Network error. Please check your connection and try again.",
    };
  }

  if (!res.ok) {
    let message = "Login failed. Please try again.";
    try {
      const errJson = (await res.json()) as {
        message?: string | string[];
      } | null;
      if (errJson) {
        if (Array.isArray(errJson.message)) message = errJson.message.join(", ");
        else if (typeof errJson.message === "string") message = errJson.message;
      }
    } catch {
      if (res.status === 429) {
        message = "Too many login attempts. Please wait a moment and try again.";
      } else if (res.status === 401) {
        message = "Invalid email or password.";
      }
    }
    return { ok: false, status: res.status, message };
  }

  // NestJS TransformInterceptor wraps responses in { data: ... }
  const payload = parseBackendAuthPayload(await res.json());
  if (!payload) {
    return {
      ok: false,
      status: 500,
      message: "Unexpected response from server.",
    };
  }
  return { ok: true, data: payload };
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) {
          throw new BackendLoginError("Email and password are required.");
        }

        const result = await loginAgainstBackend(email, password);
        if (!result.ok) {
          throw new BackendLoginError(result.message);
        }

        const { user, accessToken, refreshToken } = result.data;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar ?? null,
          role: normalizeRole(user.role),
          isVerified: user.isVerified,
          accessToken,
          refreshToken,
        };
      },
    }),
  ],

  // Outer NextAuth session-cookie lifetime. Independent of the backend's own
  // access/refresh token lifetimes, which the jwt callback below tracks and
  // renews on its own — this is just how long the browser cookie itself is
  // allowed to live before the user has to log in again from scratch.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      // Sign-in: seed the token from the credentials-provider result.
      if (user) {
        token.role = (user as { role: UserRole }).role;
        token.isVerified = (user as { isVerified: boolean }).isVerified;
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.refreshToken = (user as { refreshToken?: string }).refreshToken;
        token.accessTokenExpires = token.accessToken
          ? getAccessTokenExpiresAt(token.accessToken as string)
          : undefined;
        token.error = undefined;
        return token;
      }

      const expiresAt = token.accessTokenExpires as number | undefined;
      const hasFreshAccessToken =
        typeof token.accessToken === "string" &&
        typeof expiresAt === "number" &&
        Date.now() < expiresAt - REFRESH_SKEW_MS;

      if (hasFreshAccessToken) {
        return token;
      }

      // No refresh token to work with — e.g. a session cookie issued before
      // this flow existed, so this JWT never got a refreshToken/
      // accessTokenExpires in the first place. Nothing we can safely refresh;
      // leave the token exactly as-is, same as the old no-refresh behavior
      // (keep serving the access token until it naturally 401s upstream).
      if (typeof token.refreshToken !== "string") {
        return token;
      }

      const refreshed = await refreshAccessTokenDeduped(token.refreshToken);
      if (!refreshed.ok) {
        // Standard fail-soft pattern: flag the error, but never clear out an
        // access token that might still be perfectly valid. Never throw here
        // — an exception from this callback is exactly what used to wipe
        // sessions (see header comment). Worst case from here on is a 401 on
        // the next backend call once the access token truly expires, forcing
        // a normal re-login — not a corrupted session.
        token.error = "RefreshAccessTokenError";
        return token;
      }

      token.accessToken = refreshed.data.accessToken;
      token.refreshToken = refreshed.data.refreshToken;
      token.accessTokenExpires = getAccessTokenExpiresAt(refreshed.data.accessToken);
      token.role = normalizeRole(refreshed.data.user.role);
      token.isVerified = refreshed.data.user.isVerified;
      token.error = undefined;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as UserRole) ?? "buyer";
        session.user.isVerified =
          (token.isVerified as boolean | undefined) ?? false;
      }
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as "RefreshAccessTokenError" | undefined;
      return session;
    },
  },
});
