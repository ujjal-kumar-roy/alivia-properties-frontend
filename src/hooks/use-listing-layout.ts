"use client"

import { useCallback, useSyncExternalStore } from "react"

export type ListingLayout = "grid" | "list"

/** Where the visitor's grid/list choice lives (device only, shared by every category). */
export const LISTING_LAYOUT_KEY = "alivia_mkt_layout"
const LAYOUT_EVENT = "alivia:mkt-layout"

// Read once and then served from memory, so a blocked localStorage (private
// window, disabled site data) still lets the toggle work for the session.
let cached: ListingLayout | null = null

function read(): ListingLayout {
  if (cached) return cached
  try {
    cached = window.localStorage.getItem(LISTING_LAYOUT_KEY) === "list" ? "list" : "grid"
  } catch {
    cached = "grid"
  }
  return cached
}

function subscribe(onChange: () => void) {
  // Another tab changed it: drop the memory copy so the next read sees storage.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== LISTING_LAYOUT_KEY) return
    cached = null
    onChange()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(LAYOUT_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(LAYOUT_EVENT, onChange)
  }
}

/**
 * The grid/list preference for category results. The server (and the first
 * client render) is always "grid", then it reconciles with localStorage with no
 * hydration mismatch; every component using it stays in sync through a window
 * event, so the toolbar toggle and the results list change together.
 */
export function useListingLayout(): [ListingLayout, (layout: ListingLayout) => void] {
  const layout = useSyncExternalStore(subscribe, read, () => "grid" as ListingLayout)

  const setLayout = useCallback((next: ListingLayout) => {
    cached = next
    try {
      window.localStorage.setItem(LISTING_LAYOUT_KEY, next)
    } catch {
      // Not persisted this time; the in-memory copy still applies.
    }
    window.dispatchEvent(new Event(LAYOUT_EVENT))
  }, [])

  return [layout, setLayout]
}
