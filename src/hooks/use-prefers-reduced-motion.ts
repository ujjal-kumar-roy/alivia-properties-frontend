"use client"

import { useSyncExternalStore } from "react"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(REDUCED_MOTION_QUERY)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  )
}
