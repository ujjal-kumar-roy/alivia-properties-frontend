"use client"

import { Button } from "@/components/ui/button"
import { LS_COOKIE_CONSENT } from "@/lib/constants"
import { useEffect, useState } from "react"

type ConsentChoice = "accepted" | "declined"

/**
 * First-visit cookie notice. Checked in an effect (not during render) so the
 * server-rendered markup and the first client render always agree — reading
 * localStorage during render would mismatch on hydration. Recording either
 * choice hides the banner for good; this is a UI-only consent record, there
 * is no analytics/cookie gating in the app yet to hook the choice into.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LS_COOKIE_CONSENT)
      // Fetch-on-mount localStorage read — intentional, not state derived from props.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!stored) setVisible(true)
    } catch {
      // localStorage unavailable (private mode, blocked storage) — skip the
      // banner rather than risk throwing on every page load.
    }
  }, [])

  function recordChoice(choice: ConsentChoice) {
    try {
      window.localStorage.setItem(LS_COOKIE_CONSENT, choice)
    } catch {
      // Ignore write failures — banner still dismisses for this page view.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none fixed inset-x-0 bottom-0 z-50 px-4 pb-4 duration-300 ease-out sm:px-6"
    >
      <div className="liquid-glass-control mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <p className="text-sm leading-relaxed text-ink-700">
          We use cookies to remember your preferences and improve your
          experience on this site.
        </p>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => recordChoice("declined")}
            className="glass-interactive text-ink-600 hover:bg-ink-900/5 hover:text-ink-900"
          >
            Decline
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => recordChoice("accepted")}
            className="glass-interactive bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-300"
          >
            Accept Cookies
          </Button>
        </div>
      </div>
    </div>
  )
}
