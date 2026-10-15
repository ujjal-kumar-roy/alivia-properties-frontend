"use client"

import { useSyncExternalStore } from "react"

import {
  clearRecentProducts,
  getRecentProductsServerSnapshot,
  getRecentProductsSnapshot,
  subscribeRecentProducts,
  type RecentProduct,
} from "@/lib/recent-products"

/**
 * The visitor's recently viewed products, newest first. Empty on the server and
 * during hydration (so markup matches), then the stored list. Stays in sync
 * across components and tabs.
 */
export function useRecentProducts(): { items: RecentProduct[]; clear: () => void } {
  const items = useSyncExternalStore(
    subscribeRecentProducts,
    getRecentProductsSnapshot,
    getRecentProductsServerSnapshot,
  )
  return { items, clear: clearRecentProducts }
}
