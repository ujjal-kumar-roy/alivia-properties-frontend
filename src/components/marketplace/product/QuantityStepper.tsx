"use client"

import { Minus, Plus } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react"
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react"

import { cn } from "@/lib/utils"

/** How the last quantity change should look: which way the digits roll, or no roll at all. */
export type QuantityChange = {
  /** 1 = the number went up (digits roll upward), -1 = it went down. */
  dir: 1 | -1
  /** Typed values and keyboard steps apply instantly (no roll, no tween). */
  instant: boolean
  /** Roll length in ms. Shorter while a held button repeats fast, so rolls never stack up. */
  duration: number
}

/** The resting state (first render, or nothing to animate). */
export const STEADY_CHANGE: QuantityChange = { dir: 1, instant: true, duration: 0 }

const ROLL_MS = 160
const ROLL_OFFSET_PX = 6
/** Press-and-hold: first repeat after this delay, then faster and faster down to the floor. */
const HOLD_DELAY_MS = 380
const REPEAT_START_MS = 150
const REPEAT_FLOOR_MS = 45
const REPEAT_ACCELERATION = 0.86
const DEFAULT_MAX = 999_999
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]

type RollCustom = QuantityChange & { offset: number }

// Old number leaves the way the count moved, new one arrives from the other side
// (up for more, down for less). Transform strings, opacity only.
const roll: Variants = {
  enter: ({ dir, instant, offset }: RollCustom) =>
    instant
      ? { opacity: 1, transform: "translateY(0px)" }
      : { opacity: 0, transform: `translateY(${dir * offset}px)` },
  center: ({ instant, duration }: RollCustom) => ({
    opacity: 1,
    transform: "translateY(0px)",
    transition: { duration: instant ? 0 : duration / 1000, ease: EASE_OUT },
  }),
  exit: ({ dir, instant, duration, offset }: RollCustom) => ({
    opacity: 0,
    transform: `translateY(${-dir * offset}px)`,
    transition: { duration: instant ? 0 : duration / 1000, ease: EASE_OUT },
  }),
}

type QuantityStepperProps = {
  value: number
  min: number
  max?: number
  /** How the current value arrived (drives the digit roll); pass back what onChange gave you. */
  change: QuantityChange
  onChange: (next: number, change: QuantityChange) => void
  /** Accessible name of the number field, e.g. "Quantity (bag)". */
  label: string
  /** id for the number field, so a visible <label htmlFor> can point at it. */
  id?: string
  /** Tighter field for the phone action bar (buttons stay 44px). */
  compact?: boolean
  className?: string
}

/**
 * − [n] + with a typeable field. Buttons step by 1 and repeat (accelerating) while
 * held; the number rolls 160ms on pointer steps and changes instantly for keyboard
 * and typed input. Below `min` is never committed: partial typing waits, blur clamps.
 */
export function QuantityStepper({
  value,
  min,
  max = DEFAULT_MAX,
  change,
  onChange,
  label,
  id,
  compact = false,
  className,
}: QuantityStepperProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const reduceMotion = useReducedMotion()
  // While the field has focus it shows what is being typed; otherwise the committed value.
  const [draft, setDraft] = useState<string | null>(null)

  // Timers read the newest value without waiting for the parent to re-render.
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  }, [value])

  const hold = useRef<{ timer: number | undefined; interval: number; repeated: boolean }>({
    timer: undefined,
    interval: REPEAT_START_MS,
    repeated: false,
  })

  const stopHold = useCallback(function stop() {
    window.clearTimeout(hold.current.timer)
    hold.current.timer = undefined
    window.removeEventListener("pointerup", stop)
    window.removeEventListener("pointercancel", stop)
    window.removeEventListener("blur", stop)
  }, [])

  useEffect(() => stopHold, [stopHold])

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)))

  function step(delta: 1 | -1, how: "tap" | "repeat" | "key"): boolean {
    const current = latest.current
    const next = clamp(current + delta)
    if (next === current) return false
    latest.current = next
    const duration =
      how === "repeat" ? Math.min(ROLL_MS, Math.round(hold.current.interval * 0.9)) : ROLL_MS
    onChange(next, { dir: delta, instant: how === "key", duration })
    return true
  }

  function startHold(delta: 1 | -1) {
    stopHold()
    hold.current.repeated = false
    hold.current.interval = REPEAT_START_MS
    const tick = () => {
      hold.current.repeated = true
      if (!step(delta, "repeat")) {
        stopHold()
        return
      }
      hold.current.interval = Math.max(REPEAT_FLOOR_MS, hold.current.interval * REPEAT_ACCELERATION)
      hold.current.timer = window.setTimeout(tick, hold.current.interval)
    }
    hold.current.timer = window.setTimeout(tick, HOLD_DELAY_MS)
    // Releasing anywhere ends the hold, even if the button went aria-disabled meanwhile.
    window.addEventListener("pointerup", stopHold)
    window.addEventListener("pointercancel", stopHold)
    window.addEventListener("blur", stopHold)
  }

  const atMin = value <= min
  const atMax = value >= max

  function buttonHandlers(delta: 1 | -1) {
    const blocked = delta < 0 ? atMin : atMax
    return {
      // A tap steps on click (so a scroll that starts on the button changes nothing);
      // holding past HOLD_DELAY_MS starts the repeat instead.
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || blocked) return
        startHold(delta)
      },
      onPointerLeave: stopHold,
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        // detail 0 = Enter/Space (or assistive tech): apply instantly.
        if (event.detail !== 0 && hold.current.repeated) {
          hold.current.repeated = false
          return
        }
        step(delta, event.detail === 0 ? "key" : "tap")
      },
      // Long-press must not open the context menu / callout on phones.
      onContextMenu: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault(),
    }
  }

  function commit(text: string, final: boolean) {
    const parsed = Number.parseInt(text, 10)
    if (Number.isNaN(parsed)) {
      if (final) setDraft(null)
      return
    }
    // Still typing towards the minimum (e.g. "5" on the way to "500"): wait.
    if (!final && parsed < min) return
    const next = clamp(parsed)
    if (next !== latest.current) {
      onChange(next, { dir: next > latest.current ? 1 : -1, instant: true, duration: 0 })
      latest.current = next
    }
    if (final) setDraft(null)
    else if (next !== parsed) setDraft(String(next))
  }

  function onFieldKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const jumps: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: 10, PageDown: -10 }
    if (event.key in jumps) {
      event.preventDefault()
      const next = clamp(latest.current + jumps[event.key])
      setDraft(String(next))
      if (next !== latest.current) {
        onChange(next, { dir: next > latest.current ? 1 : -1, instant: true, duration: 0 })
        latest.current = next
      }
    } else if (event.key === "Home") {
      event.preventDefault()
      setDraft(String(min))
      commit(String(min), false)
    } else if (event.key === "Enter") {
      commit(draft ?? String(value), true)
    }
  }

  const text = draft ?? String(value)
  const custom: RollCustom = {
    ...change,
    offset: reduceMotion ? 0 : ROLL_OFFSET_PX,
    // Reduced motion keeps a short crossfade and drops the movement.
    duration: reduceMotion ? Math.min(change.duration, 120) : change.duration,
  }

  const buttonClass = (blocked: boolean) =>
    cn(
      "flex size-11 shrink-0 touch-manipulation select-none items-center justify-center rounded-full text-ink-800 [-webkit-touch-callout:none]",
      "transition-[scale,background-color,color] duration-140 ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 motion-reduce:transition-colors",
      blocked
        ? "cursor-not-allowed text-ink-300"
        : "active:scale-[0.97] active:bg-ink-100 motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-ink-100",
    )

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-ink-200 p-0.5 transition-[border-color,box-shadow] duration-160 ease-(--ease-out) has-[input:focus]:border-brand-400 has-[input:focus]:ring-2 has-[input:focus]:ring-brand-400/25",
        compact ? "bg-white/90" : "bg-white",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        aria-controls={inputId}
        aria-disabled={atMin || undefined}
        className={buttonClass(atMin)}
        {...buttonHandlers(-1)}
      >
        <Minus aria-hidden="true" className="size-4" strokeWidth={2.5} />
      </button>

      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          role="spinbutton"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          value={text}
          onFocus={(event) => {
            setDraft(String(value))
            event.currentTarget.select()
          }}
          onChange={(event) => {
            const clean = event.target.value.replace(/\D/g, "").slice(0, String(max).length)
            setDraft(clean)
            commit(clean, false)
          }}
          onBlur={() => commit(draft ?? String(value), true)}
          onKeyDown={onFieldKeyDown}
          // Width follows the digits (tabular, so 1ch = one digit) so 4- and 6-digit bulk
          // quantities fit without a wide empty box for the usual "1".
          style={{ width: `calc(${Math.max(compact ? 2 : 3, text.length)}ch + ${compact ? "0.75rem" : "1.25rem"})` }}
          // The committed number is drawn by the roll layer below; the field's own text
          // shows only while it has focus (typing), at the same spot.
          className="peer h-11 bg-transparent text-center text-base font-bold tabular-nums text-transparent caret-ink-900 outline-none selection:bg-brand-100 focus:text-ink-900 forced-colors:text-[CanvasText]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden peer-focus:invisible forced-colors:hidden"
        >
          <AnimatePresence initial={false} custom={custom}>
            <motion.span
              key={value}
              custom={custom}
              variants={roll}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 flex items-center justify-center text-base font-bold tabular-nums text-ink-900"
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <button
        type="button"
        aria-label="Increase quantity"
        aria-controls={inputId}
        aria-disabled={atMax || undefined}
        className={buttonClass(atMax)}
        {...buttonHandlers(1)}
      >
        <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  )
}
