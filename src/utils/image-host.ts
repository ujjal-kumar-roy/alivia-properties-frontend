/**
 * Origins (protocol + host) next.config.ts allows next/image to optimize (its
 * `remotePatterns`, which pin the protocol). Keep in sync with that file.
 * next/image THROWS for an unlisted host
 * unless `unoptimized` is set, so anything not recognised here must stay
 * unoptimized (an admin can paste any URL into a photo field).
 */
const OPTIMIZABLE_ORIGINS = new Set([
  "https://images.unsplash.com",
  "https://i.pravatar.cc",
  "http://localhost:9000", // MinIO, local dev
  "https://api-prd.aliviaproperties.com", // MinIO behind nginx, production
])

/**
 * True when the Next image optimizer can safely resize/convert this source:
 * a local /public file or a listed host. Uploaded photos can be multi-megabyte
 * PNGs (one category photo was 2.9 MB); optimizing them cuts a phone's download
 * to tens of KB. SVGs are left alone (the optimizer refuses them by default).
 */
export function canOptimize(src?: string | null): boolean {
  if (!src) return false
  const path = src.split("?")[0].toLowerCase()
  if (path.endsWith(".svg") || path.endsWith(".gif")) return false
  if (src.startsWith("/") && !src.startsWith("//")) return true
  try {
    return OPTIMIZABLE_ORIGINS.has(new URL(src).origin)
  } catch {
    return false
  }
}
