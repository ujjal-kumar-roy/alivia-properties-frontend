"use client"

import { useCallback, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Shared bits for the plain (non react-hook-form) lead forms: contact and
 * consultation. Fields keep their native `required` / `type` constraints, so
 * autofill and the submitted payload are exactly what they were. The only change
 * is where a problem shows up: under the field, not in a browser bubble.
 */

/** Text control look. Phones get the 44px height and 16px text from the global form rules. */
export const FIELD_CLASS =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-base text-ink-900 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm"

type FieldProps = {
  id: string
  label: string
  error?: string
  className?: string
  children: ReactNode
}

/** Label above the control, the inline error right under it. */
export function Field({ id, label, error, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[0.8125rem] font-semibold text-ink-800">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[0.8125rem] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

function isControl(el: Element): el is Control {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement
  )
}

function messageFor(el: Control): string {
  const v = el.validity
  if (v.valueMissing) return el instanceof HTMLSelectElement ? "Please choose an option" : "This field is required"
  if (v.typeMismatch) return el.type === "email" ? "Enter a valid email address" : "Enter a valid value"
  return el.validationMessage || "Check this field"
}

/**
 * Runs the browser's own constraint checks (so the rules never drift from the
 * markup) and keeps the messages in state for inline display. Use it with
 * `<form noValidate>`: `validate(form)` returns true when the form may submit,
 * otherwise it shows the messages and focuses the first invalid field.
 */
export function useInlineValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback((form: HTMLFormElement) => {
    const next: Record<string, string> = {}
    let first: Control | null = null
    for (const el of Array.from(form.elements)) {
      if (!isControl(el) || !el.name || !el.willValidate || el.validity.valid) continue
      next[el.name] = messageFor(el)
      first ??= el
    }
    setErrors(next)
    first?.focus()
    return first === null
  }, [])

  /** Drop one field's message as soon as the visitor edits it. */
  const clear = useCallback((name: string) => {
    setErrors((prev) => {
      if (!(name in prev)) return prev
      const rest = { ...prev }
      delete rest[name]
      return rest
    })
  }, [])

  return { errors, validate, clear }
}
