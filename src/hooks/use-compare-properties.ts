"use client"

import { useEffect, useState, useCallback } from "react"
import { LS_COMPARE_LIST, MAX_COMPARE_ITEMS } from "@/lib/constants"
import type { Property } from "@/types/property.types"

const COMPARE_EVENT = "alivia:compare-list"
// What the visitor saw when they added each listing. The by-id lookup needs a
// login but by-slug is public, so /compare renders from these snapshots first
// and then refreshes them by slug.
const COMPARE_SNAPSHOTS = "alivia_compare_snapshots"

function getList(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(LS_COMPARE_LIST) ?? "[]") as string[]
  } catch {
    return []
  }
}

function getSnapshots(): Record<string, Property> {
  if (typeof window === "undefined") return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(COMPARE_SNAPSHOTS) ?? "{}")
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, Property>)
      : {}
  } catch {
    return {}
  }
}

function writeSnapshots(map: Record<string, Property>) {
  try {
    localStorage.setItem(COMPARE_SNAPSHOTS, JSON.stringify(map))
  } catch {
    // Storage full or blocked: the compare list still works without snapshots.
  }
}

export function useCompareProperties() {
  // Start empty to match server render, then reconcile with localStorage after
  // mount — avoids a hydration mismatch when the list already has items.
  const [list, setList] = useState<string[]>([])
  const [snapshots, setSnapshots] = useState<Record<string, Property>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    function syncFromStorage() {
      setList(getList())
      setSnapshots(getSnapshots())
      setReady(true)
    }

    syncFromStorage()
    window.addEventListener("storage", syncFromStorage)
    window.addEventListener(COMPARE_EVENT, syncFromStorage)
    return () => {
      window.removeEventListener("storage", syncFromStorage)
      window.removeEventListener(COMPARE_EVENT, syncFromStorage)
    }
  }, [])

  const sync = useCallback((next: string[], snapshotPatch?: Record<string, Property | null>) => {
    localStorage.setItem(LS_COMPARE_LIST, JSON.stringify(next))
    // Keep a snapshot only for ids that are still in the list.
    const merged = { ...getSnapshots() }
    for (const [id, value] of Object.entries(snapshotPatch ?? {})) {
      if (value) merged[id] = value
      else delete merged[id]
    }
    const kept: Record<string, Property> = {}
    for (const id of next) if (merged[id]) kept[id] = merged[id]
    writeSnapshots(kept)
    window.dispatchEvent(new Event(COMPARE_EVENT))
    setList(next)
    setSnapshots(kept)
  }, [])

  const add = useCallback((id: string, snapshot?: Property) => {
    const current = getList()
    if (current.includes(id) || current.length >= MAX_COMPARE_ITEMS) return
    sync([...current, id], snapshot ? { [id]: snapshot } : undefined)
  }, [sync])

  const remove = useCallback((id: string) => {
    sync(getList().filter((i) => i !== id))
  }, [sync])

  const toggle = useCallback((id: string, snapshot?: Property) => {
    const current = getList()
    if (current.includes(id)) {
      sync(current.filter((i) => i !== id))
    } else if (current.length < MAX_COMPARE_ITEMS) {
      sync([...current, id], snapshot ? { [id]: snapshot } : undefined)
    }
  }, [sync])

  const clear = useCallback(() => sync([]), [sync])

  /** Replace snapshots with fresher copies from the API (ids not in the list are ignored). */
  const refreshSnapshots = useCallback((fresh: Record<string, Property>) => {
    const current = getList()
    const patch: Record<string, Property> = {}
    for (const id of current) if (fresh[id]) patch[id] = fresh[id]
    if (Object.keys(patch).length === 0) return
    sync(current, patch)
  }, [sync])

  const isAdded = useCallback((id: string) => list.includes(id), [list])

  return {
    list,
    snapshots,
    ready,
    add,
    remove,
    toggle,
    clear,
    refreshSnapshots,
    isAdded,
    isFull: list.length >= MAX_COMPARE_ITEMS,
  }
}
