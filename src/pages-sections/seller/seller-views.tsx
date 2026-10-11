"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { Button } from "@/components/ui/button"
import { usersService } from "@/services/users.service"
import { ApiError } from "@/services/http-client"
import type { Seller } from "@/types/user.types"

export function SellerProfileForm({ seller }: { seller: Seller | null }) {
  const { data: session } = useSession()
  const [values, setValues] = useState({
    name: seller?.name ?? "",
    email: seller?.email ?? "",
    phone: seller?.phone ?? "",
    whatsApp: seller?.whatsApp ?? "",
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSaved(false)
    setSubmitError(null)
    setValues((current) => ({ ...current, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.accessToken) {
      setSubmitError("Please sign in again to update your profile.")
      return
    }

    setSaving(true)
    setSubmitError(null)

    try {
      await usersService.updateMe(
        {
          name: values.name,
          phone: values.phone || undefined,
        },
        session.accessToken,
      )
      setSaved(true)
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not save your profile right now.",
      )
    } finally {
      setSaving(false)
    }
  }

  const fields: { name: keyof typeof values; label: string; type?: string; readOnly?: boolean; hint?: string }[] = [
    { name: "name", label: "Full Name" },
    {
      name: "email",
      label: "Email Address",
      type: "email",
      readOnly: true,
      hint: "Email changes are handled by support to keep account verification intact.",
    },
    { name: "phone", label: "Phone Number", type: "tel" },
    {
      name: "whatsApp",
      label: "WhatsApp Number",
      type: "tel",
      hint: "Displayed for convenience in the dashboard. Dedicated WhatsApp profile sync is not exposed by the API yet.",
    },
  ]

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4 pt-1 sm:space-y-5 sm:pt-2">
      {submitError && (
        <div aria-live="polite" className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {submitError}
        </div>
      )}

      {fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <label htmlFor={`seller-${field.name}`} className="text-sm font-medium text-ink-800">
            {field.label}
          </label>
          <input
            id={`seller-${field.name}`}
            name={field.name}
            type={field.type ?? "text"}
            value={values[field.name]}
            onChange={handleChange}
            readOnly={field.readOnly}
            className={`w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 ${field.readOnly ? "cursor-not-allowed bg-ink-50 text-ink-500" : ""}`}
          />
          {field.hint && <p className="text-xs text-ink-500">{field.hint}</p>}
        </div>
      ))}
      {saved && (
        <p role="status" className="text-sm font-medium text-emerald-700 md:hidden">
          Profile saved
        </p>
      )}
      <div className="hidden items-center gap-3 pt-2 md:flex">
        <Button type="submit" className="rounded-full" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && <span className="text-xs font-medium text-emerald-600">Profile saved</span>}
      </div>
      <MobileActionBar label="Save profile">
        <button type="submit" className="btn-tactile btn-tactile--block flex-1" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </MobileActionBar>
    </form>
  )
}
