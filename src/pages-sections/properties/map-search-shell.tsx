"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { List, Map as MapIcon } from "lucide-react"
import { haptic, prefersReducedMotion } from "@/lib/celebrate"
import { cn } from "@/lib/utils"

type View = "list" | "map"

type MapSearchShellProps = {
  /** Title and search box. */
  header: ReactNode
  /** "8 properties" or similar, shown beside the toggle. */
  count: string
  list: ReactNode
  map: ReactNode
}

/**
 * Map search layout. From lg it is the split view (list left, map right). On
 * phones both would not fit, so a glass segmented control swaps between them;
 * the list is the default because it is the part that works today.
 *
 * The panels are server-rendered by the page and passed in, so this client
 * wrapper only owns which one is showing.
 */
export function MapSearchShell({ header, count, list, map }: MapSearchShellProps) {
  const [view, setView] = useState<View>("list")
  const listRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const swapped = useRef(false)

  // On phones the incoming panel slides in from the side of its tab (list is left,
  // map is right), like a native segmented control. Skipped on first render, at
  // lg (both panels are always shown) and for reduced motion.
  useEffect(() => {
    if (!swapped.current) {
      swapped.current = true
      return
    }
    if (prefersReducedMotion() || !window.matchMedia("(max-width: 1023.98px)").matches) return
    const from = view === "map" ? 24 : -24
    ;(view === "map" ? mapRef : listRef).current?.animate(
      [
        { opacity: 0, transform: `translateX(${from}px)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 280, easing: "cubic-bezier(0.32, 0.72, 0, 1)" },
    )
  }, [view])

  function choose(next: View) {
    if (next === view) return
    haptic("tap")
    setView(next)
  }

  return (
    <div className="flex flex-col lg:h-[calc(100vh-64px)] lg:flex-row">
      <div className="flex min-w-0 shrink-0 flex-col bg-white lg:w-96 lg:border-r lg:border-border">
        <div className="enter-cascade space-y-2.5 px-4 pb-3 pt-2 lg:border-b lg:border-border lg:p-4">{header}</div>

        <div className="flex items-center justify-between gap-3 px-4 pb-3 lg:hidden">
          {/* Segmented control: one sliding pill (transform only) over two buttons. */}
          <div
            role="tablist"
            aria-label="Show listings as"
            className="liquid-glass-control relative inline-grid grid-cols-2 rounded-full border p-1"
          >
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-brand-700 shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                view === "map" && "translate-x-full",
              )}
            />
            {(
              [
                { id: "list", label: "List", Icon: List },
                { id: "map", label: "Map", Icon: MapIcon },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`map-search-tab-${id}`}
                aria-selected={view === id}
                aria-controls={`map-search-${id}`}
                onClick={() => choose(id)}
                className={cn(
                  "relative z-10 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold transition-[color,scale] duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
                  view === id ? "text-white" : "text-ink-700",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs font-medium text-ink-500">{count}</p>
        </div>

        <div
          ref={listRef}
          role="tabpanel"
          id="map-search-list"
          aria-labelledby="map-search-tab-list"
          className={cn(
            "min-w-0 px-4 pb-6 lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-3",
            view === "list" ? "block" : "hidden",
          )}
        >
          <p className="mb-2 hidden text-xs text-muted-foreground lg:block">{count}</p>
          {list}
        </div>
      </div>

      <div
        ref={mapRef}
        role="tabpanel"
        id="map-search-map"
        aria-labelledby="map-search-tab-map"
        className={cn(
          "min-w-0 px-4 pb-6 lg:flex lg:flex-1 lg:p-0",
          view === "map" ? "block" : "hidden",
        )}
      >
        {map}
      </div>
    </div>
  )
}
