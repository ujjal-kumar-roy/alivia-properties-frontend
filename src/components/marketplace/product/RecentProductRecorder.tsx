"use client"

import { useEffect } from "react"

import { recordRecentProduct, type RecentProduct } from "@/lib/recent-products"

/**
 * Renders nothing; remembers this product on the visitor's device so the
 * "Recently viewed" rail can show it on other product pages.
 */
export function RecentProductRecorder({ product }: { product: Omit<RecentProduct, "viewedAt"> }) {
  const { slug, name, image, price, unit, supplierName } = product

  // Primitive deps: the server re-sends a fresh `product` object on every render.
  useEffect(() => {
    recordRecentProduct({ slug, name, image, price, unit, supplierName })
  }, [slug, name, image, price, unit, supplierName])

  return null
}
