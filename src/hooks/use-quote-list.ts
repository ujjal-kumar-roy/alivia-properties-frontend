"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  addToQuoteList,
  clearQuoteList,
  getQuoteListServerSnapshot,
  getQuoteListSnapshot,
  removeFromQuoteList,
  setQuoteListQty,
  subscribeQuoteList,
} from "@/lib/quote-list"

const subscribeNever = () => () => {}

/**
 * The quote list saved on this device. Like useSaveProperty, the server render
 * and the hydration pass see an empty list, then it reconciles with
 * localStorage (and stays in sync across tabs and every mounted hook), so
 * nothing mismatches. Render nothing count-dependent until `ready`.
 */
export function useQuoteList() {
  const items = useSyncExternalStore(
    subscribeQuoteList,
    getQuoteListSnapshot,
    getQuoteListServerSnapshot,
  )
  // false on the server and during hydration, true from the first client commit after.
  const ready = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )

  const has = useCallback(
    (productId: string) => items.some((item) => item.productId === productId),
    [items],
  )

  return {
    items,
    count: items.length,
    ready,
    has,
    add: addToQuoteList,
    remove: removeFromQuoteList,
    setQty: setQuoteListQty,
    clear: clearQuoteList,
  }
}
