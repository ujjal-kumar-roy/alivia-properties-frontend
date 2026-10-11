"use client"

import Image, { type ImageProps } from "next/image"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { canOptimize } from "@/utils/image-host"

type MediaImageProps = Omit<ImageProps, "onError" | "ref" | "src"> & {
  /** A missing URL (null, undefined, empty) shows the fallback straight away. */
  src?: string | null
  /** Rendered instead of the photo when the URL is empty or fails to load. */
  fallback: ReactNode
}

/**
 * A next/image that degrades to a calm placeholder when a remote photo is
 * missing or 404s (seeded and uploaded URLs do go stale), so a card never shows
 * a broken-image icon or raw alt text. It also catches a failure that happened
 * before hydration, by checking the element once on mount.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function MediaImage({ fallback, src, alt, unoptimized: _requested, ...props }: MediaImageProps) {
  const key = src ?? ""
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const el = ref.current
    // The error may have fired before React attached onError.
    if (el && el.complete && el.naturalWidth === 0) setFailedKey(key)
  }, [key])

  if (!src || failedKey === key) return <>{fallback}</>
  // Callers historically pass `unoptimized` for backend photos. That ships raw,
  // sometimes multi-megabyte, files to phones, so optimize whenever the host is
  // known-safe (see canOptimize) and fall back to raw only for unknown hosts.
  return (
    <Image
      ref={ref}
      src={src}
      alt={alt}
      onError={() => setFailedKey(key)}
      unoptimized={!canOptimize(src)}
      {...props}
    />
  )
}
