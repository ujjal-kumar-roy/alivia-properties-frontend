"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  BadgeCheck,
  Check,
  Loader2,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"

import { DetailBack, DetailHero, Fact, FactGrid } from "@/components/dashboard/detail"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ApiError } from "@/services/http-client"
import { usersService } from "@/services/users.service"
import type { User, UserRole } from "@/types/user.types"
import { formatDateTime } from "@/utils/format-date"

type UserDetailPanelProps = {
  user: User
  token?: string
  /** The signed-in admin's own id (next-auth session.user.id) — used to
   *  block self-demotion in the UI (defense in depth; the UI-only guard,
   *  not currently backed by a check in UsersService.update on the API). */
  currentUserId?: string
  backHref: string
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "seller", label: "Seller" },
  { value: "buyer", label: "Buyer" },
]

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  admin: "border-purple-200 bg-purple-50 text-purple-700",
  seller: "border-blue-200 bg-blue-50 text-blue-700",
  buyer: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "?"
}

export function UserDetailPanel({ user, token, currentUserId, backHref }: UserDetailPanelProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(user)
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null)
  const [savingVerify, setSavingVerify] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const isSelf = Boolean(currentUserId) && currentUserId === current.id
  const busy = pendingRole !== null || savingVerify

  function reportError(err: unknown, fallback: string) {
    setError(
      err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : fallback,
    )
  }

  async function changeRole(role: UserRole) {
    if (role === current.role || isSelf || busy) return
    const label = ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role
    if (!window.confirm(`Change ${current.name}'s role to ${label}?`)) return

    setPendingRole(role)
    setError(null)
    setSaved(null)
    try {
      const updated = await usersService.updateRole(current.id, role, token)
      setCurrent((c) => ({ ...c, ...updated }))
      setSaved(`Role updated to ${label}.`)
      router.refresh()
    } catch (err) {
      reportError(err, "Could not update this user's role.")
    } finally {
      setPendingRole(null)
    }
  }

  async function toggleVerified() {
    if (busy) return
    const next = !current.isVerified
    setSavingVerify(true)
    setError(null)
    setSaved(null)
    try {
      const updated = await usersService.updateVerification(current.id, next, token)
      setCurrent((c) => ({ ...c, ...updated }))
      setSaved(next ? "User verified." : "Verification removed.")
      router.refresh()
    } catch (err) {
      reportError(err, "Could not update verification status.")
    } finally {
      setSavingVerify(false)
    }
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <DetailBack href={backHref}>Back</DetailBack>

      <div className="grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-[1fr_360px]">
        <section className="surface-card overflow-hidden">
          <DetailHero
            leading={
              <Avatar className="size-14 shrink-0 ring-4 ring-white/20 sm:size-16">
                {current.avatar ? (
                  <AvatarImage src={current.avatar} alt={current.name} />
                ) : null}
                <AvatarFallback className="bg-brand-700 text-base font-semibold text-white">
                  {initials(current.name)}
                </AvatarFallback>
              </Avatar>
            }
            title={<span className="block truncate">{current.name}</span>}
            meta={
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                    ROLE_BADGE_STYLES[current.role],
                  )}
                >
                  {ROLE_OPTIONS.find((r) => r.value === current.role)?.label ?? current.role}
                </span>
                {current.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                    <ShieldAlert className="h-3 w-3" />
                    Not verified
                  </span>
                )}
              </span>
            }
          />

          <div className="space-y-3 p-3 sm:space-y-5 sm:p-5">
            <FactGrid className="sm:grid-cols-2">
              <Fact label="Email" icon={Mail} href={`mailto:${current.email}`} wide>
                {current.email}
              </Fact>
              <Fact label="Phone" icon={Phone} href={current.phone ? `tel:${current.phone}` : undefined}>
                {current.phone ?? "-"}
              </Fact>
              <Fact label="Joined">{current.createdAt ? formatDateTime(current.createdAt) : "-"}</Fact>
              <Fact label="Last updated" wide>
                {current.updatedAt ? formatDateTime(current.updatedAt) : "-"}
              </Fact>
            </FactGrid>
          </div>
        </section>

        <aside className="space-y-3 sm:space-y-5">
          <div className="surface-card p-4 sm:p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:text-xs">
              Role
            </p>
            {isSelf ? (
              <p className="mt-2 text-xs text-ink-500">
                You can&apos;t change your own role from here.
              </p>
            ) : null}
            <div className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-1">
              {ROLE_OPTIONS.map((opt) => {
                const active = current.role === opt.value
                const isPending = pendingRole === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isSelf || busy || active}
                    onClick={() => changeRole(opt.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition-[background-color,scale] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 xl:justify-between xl:px-4",
                      active
                        ? "border-brand-700 bg-brand-700 text-white disabled:opacity-100"
                        : "border-border/70 bg-white text-ink-700 hover:bg-brand-50",
                    )}
                  >
                    <span>{opt.label}</span>
                    {isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : active ? (
                      <Check className="size-3.5" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="surface-card p-4 sm:p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-brand-700 sm:text-xs">
              Verification
            </p>
            <p className="mt-2 text-sm text-ink-600">
              {current.isVerified
                ? "This account is currently verified."
                : "This account has not been verified yet."}
            </p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={toggleVerified}
              className={cn(
                "mt-3 w-full rounded-full max-sm:h-11 sm:mt-4",
                current.isVerified
                  ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                  : "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100",
              )}
            >
              {savingVerify ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              {current.isVerified ? "Remove verification" : "Verify user"}
            </Button>

            {saved ? <p role="status" className="mt-3 text-sm font-medium text-emerald-700">{saved}</p> : null}
            {error ? <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
