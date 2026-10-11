"use client"

import { useEffect, useRef, useState } from "react"
import { Check } from "lucide-react"
import { GuideAvatar } from "@/components/common/guide-avatar"
import { ProgressBar } from "@/components/common/progress-bar"
import { celebrate, haptic, prefersReducedMotion } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

const LS_KEY = "alivia_moving_checklist"

type ChecklistTask = { id: string; week: number; label: string }

const TASKS: ChecklistTask[] = [
  { id: "t1",  week: 1, label: "Confirm purchase/rental agreement and handover date" },
  { id: "t2",  week: 1, label: "Notify landlord / property manager" },
  { id: "t3",  week: 2, label: "Start collecting packing materials (boxes, tape, bubble wrap)" },
  { id: "t4",  week: 2, label: "Research and book a moving company" },
  { id: "t5",  week: 3, label: "Sort belongings — donate, sell, or discard" },
  { id: "t6",  week: 3, label: "Begin packing non-essential items" },
  { id: "t7",  week: 4, label: "Update address with bank, telecom, and government services" },
  { id: "t8",  week: 4, label: "Transfer utility accounts (electricity, gas, water, internet)" },
  { id: "t9",  week: 5, label: "Pack bedroom and living area" },
  { id: "t10", week: 5, label: "Arrange key collection / handover date with seller or agent" },
  { id: "t11", week: 6, label: "Confirm moving truck schedule and access time at new address" },
  { id: "t12", week: 6, label: "Pack remaining items and label all boxes clearly" },
  { id: "t13", week: 7, label: "Deep clean old property" },
  { id: "t14", week: 7, label: "Moving day — verify all rooms before leaving" },
  { id: "t15", week: 8, label: "Inspect new property against handover checklist" },
  { id: "t16", week: 8, label: "Set up utilities and internet at new address" },
]

const WEEKS = Array.from({ length: 8 }, (_, i) => i + 1)

/** One short line from the guide, matched to how far along the visitor is. */
function guideLine(done: number, total: number): string {
  const left = total - done
  if (left === 0) return "All done. Enjoy your new place!"
  if (done === 0) return "Start with week 1. Tap a task to tick it off."
  if (done * 2 >= total) return `Past halfway. ${left} to go.`
  return `Good start. ${done} down, ${left} to go.`
}

export function MovingChecklist() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  // The task that was just ticked, so only it pops (not every saved one on load).
  const [popId, setPopId] = useState<string | null>(null)
  // The confetti is a once-only reward for finishing, not for every re-tick.
  const celebrated = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as string[]
      const ids = new Set(Array.isArray(stored) ? stored : [])
      // Finished on an earlier visit: show the cheer, but no second burst.
      if (TASKS.every((t) => ids.has(t.id))) celebrated.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(ids)
    } catch {
      // ignore
    }
  }, [])

  function toggle(id: string) {
    const next = new Set(checked)
    const nowChecked = !next.has(id)
    if (nowChecked) next.add(id)
    else next.delete(id)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify([...next]))
    } catch {
      // storage unavailable (private mode): the tick still works for this visit
    }
    setChecked(next)
    setPopId(nowChecked ? id : null)
    haptic("tap")

    if (nowChecked && !celebrated.current && TASKS.every((t) => next.has(t.id))) {
      celebrated.current = true
      celebrate()
      panelRef.current?.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      })
    }
  }

  const total = TASKS.length
  const done = TASKS.filter((t) => checked.has(t.id)).length
  const pct = Math.round((done / total) * 100)
  const complete = done === total

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div
        ref={panelRef}
        className="scroll-mt-20 rounded-2xl border border-brand-100 bg-brand-50/70 p-3.5"
      >
        <div className="flex items-center gap-3">
          <GuideAvatar mood={complete ? "cheer" : "idle"} size={44} />
          <p className="speech-bubble min-w-0 flex-1 px-3 py-2 text-[0.9375rem]" aria-live="polite">
            {guideLine(done, total)}
          </p>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <p className="text-sm font-bold text-ink-900">
            <span className="tabular-nums">{done}</span> of {total} done
          </p>
          <p className="text-xs font-semibold tabular-nums text-brand-700">{pct}%</p>
        </div>
        <ProgressBar
          value={pct}
          label="Moving checklist progress"
          tone={complete ? "gold" : "brand"}
          className="mt-1.5 h-3"
        />
      </div>

      {WEEKS.map((week) => {
        const tasks = TASKS.filter((t) => t.week === week)
        const weekDone = tasks.filter((t) => checked.has(t.id)).length
        const weekComplete = weekDone === tasks.length
        return (
          <section
            key={week}
            aria-labelledby={`moving-week-${week}`}
            className="reveal overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card)"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2">
              <h2 id={`moving-week-${week}`} className="text-sm font-bold text-ink-800">
                Week {week}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
                  weekComplete ? "text-brand-700" : "text-ink-500",
                )}
              >
                {weekComplete ? (
                  <>
                    <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                    Done
                  </>
                ) : (
                  `${weekDone}/${tasks.length}`
                )}
              </span>
            </div>
            <ul className="divide-y divide-border/40">
              {tasks.map((task) => {
                const isChecked = checked.has(task.id)
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => toggle(task.id)}
                      className="flex min-h-12 w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors active:bg-brand-50 sm:hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-colors",
                          isChecked ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-white",
                          popId === task.id && "anim-pop-in",
                        )}
                      >
                        {isChecked && <Check className="size-4" strokeWidth={3} />}
                      </span>
                      <span
                        className={cn(
                          "text-[0.9375rem] leading-snug",
                          isChecked ? "text-ink-500 line-through" : "text-ink-800",
                        )}
                      >
                        {task.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
