"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, MoreHorizontal, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type RowActionTone = "default" | "success" | "warning" | "danger"

export type RowAction = {
  key: string
  label: string
  icon: LucideIcon
  onSelect?: () => void
  href?: string
  tone?: RowActionTone
  /** Extra classes for the inline (sm+) icon button, e.g. a "switched on" look. */
  className?: string
  /** Classes for the icon itself, e.g. a filled star when a flag is on. */
  iconClassName?: string
  disabled?: boolean
  busy?: boolean
  /** Phones: show this one as its own labelled button beside the menu (use it at most once per row). */
  primary?: boolean
  /** sm and up: render it as a labelled solid button instead of an icon (the row's main action). */
  solid?: boolean
}

const TONE: Record<RowActionTone, string> = {
  default: "border-border/70 text-ink-600 hover:bg-brand-50",
  success: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  warning: "border-amber-200 text-amber-700 hover:bg-amber-50",
  danger: "border-red-200 text-red-600 hover:bg-red-50",
}

function ActionIcon({ action, className }: { action: RowAction; className?: string }) {
  const Icon = action.icon
  return action.busy ? (
    <Loader2 aria-hidden className={cn("animate-spin", className)} />
  ) : (
    <Icon aria-hidden className={cn(className, action.iconClassName)} />
  )
}

function InlineAction({ action }: { action: RowAction }) {
  if (action.solid) {
    return (
      <Button
        type="button"
        size="sm"
        className={cn("rounded-full", action.className)}
        disabled={action.disabled || action.busy}
        onClick={action.onSelect}
      >
        <ActionIcon action={action} className="size-3.5" />
        {action.label}
      </Button>
    )
  }
  const classes = cn("size-8 rounded-full", TONE[action.tone ?? "default"], action.className)
  if (action.href) {
    return (
      <Button
        variant="outline"
        size="icon"
        className={classes}
        aria-label={action.label}
        title={action.label}
        render={<Link href={action.href} />}
      >
        <ActionIcon action={action} className="size-3.5" />
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={classes}
      aria-label={action.label}
      title={action.label}
      disabled={action.disabled || action.busy}
      onClick={action.onSelect}
    >
      <ActionIcon action={action} className="size-3.5" />
    </Button>
  )
}

function PrimaryAction({ action }: { action: RowAction }) {
  const classes = cn(
    "h-9 gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold",
    action.solid ? "px-4" : TONE[action.tone ?? "default"],
  )
  const variant = action.solid ? "default" : "outline"
  if (action.href) {
    return (
      <Button variant={variant} className={classes} render={<Link href={action.href} />}>
        <ActionIcon action={action} className="size-4" />
        {action.label}
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant={variant}
      className={classes}
      disabled={action.disabled || action.busy}
      onClick={action.onSelect}
    >
      <ActionIcon action={action} className="size-4" />
      {action.label}
    </Button>
  )
}

/**
 * The actions of a table row.
 *
 * sm and up: one 32px icon button per action, exactly as before.
 * Phones: at most one labelled `primary` action plus a single 36px overflow menu holding the
 * rest, so a row with six actions costs one line instead of a wall of tiny buttons.
 */
export function RowActions({
  actions,
  menuLabel = "More actions",
  className,
}: {
  actions: RowAction[]
  menuLabel?: string
  className?: string
}) {
  const router = useRouter()
  const primary = actions.find((a) => a.primary)
  const menuActions = actions.filter((a) => a !== primary)

  return (
    <>
      <div className={cn("hidden items-center justify-end gap-1 sm:flex", className)}>
        {actions.map((action) => (
          <InlineAction key={action.key} action={action} />
        ))}
      </div>

      <div className={cn("flex items-center justify-end gap-1.5 sm:hidden", className)}>
        {primary ? <PrimaryAction action={primary} /> : null}
        {menuActions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={menuLabel}
              className="inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-white text-ink-700 outline-none transition-[background-color,scale] active:scale-95 data-popup-open:bg-brand-50"
            >
              <MoreHorizontal aria-hidden className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-52 rounded-2xl p-1.5">
              {menuActions.map((action) => {
                const Icon = action.icon
                return (
                  <DropdownMenuItem
                    key={action.key}
                    variant={action.tone === "danger" ? "destructive" : "default"}
                    disabled={action.disabled || action.busy}
                    className="min-h-11 gap-2.5 rounded-xl px-3 text-sm font-medium"
                    onClick={() => {
                      if (!action.href) action.onSelect?.()
                      // mailto: and tel: are handed to the OS, not the client router
                      else if (/^(mailto|tel):/.test(action.href)) window.location.assign(action.href)
                      else router.push(action.href)
                    }}
                  >
                    <Icon aria-hidden className={cn("size-4", action.iconClassName)} />
                    {action.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </>
  )
}
