"use client"

import { Loader2 } from "lucide-react"

import { MobileActionBar } from "@/components/common/mobile-action-bar"

type FormActionBarProps = {
  /** Landmark name for assistive tech, e.g. "Property form actions". */
  label: string
  submitLabel: string
  submitting?: boolean
  /** Shown beside Save. Omit for forms with nothing to cancel. */
  onCancel?: () => void
  cancelLabel?: string
  disabled?: boolean
}

/**
 * The phone footer of a long form: Cancel (glass) and Save (the one tactile primary), pinned in a
 * floating capsule so the next step is always at the thumb. Render it INSIDE the `<form>`; the
 * Save button is a normal submit button. md and up use the form's own inline buttons.
 */
export function FormActionBar({
  label,
  submitLabel,
  submitting = false,
  onCancel,
  cancelLabel = "Cancel",
  disabled = false,
}: FormActionBarProps) {
  return (
    <MobileActionBar label={label}>
      {onCancel ? (
        <button
          key="cancel"
          type="button"
          className="btn-glass shrink-0"
          onClick={onCancel}
          disabled={submitting}
        >
          {cancelLabel}
        </button>
      ) : null}
      {/* A distinct key: Save is the only submit button in the bar and must never inherit another button's DOM node. */}
      <button
        key="save"
        type="submit"
        className="btn-tactile btn-tactile--block flex-1"
        disabled={submitting || disabled}
      >
        {submitting ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Saving
          </>
        ) : (
          submitLabel
        )}
      </button>
    </MobileActionBar>
  )
}
