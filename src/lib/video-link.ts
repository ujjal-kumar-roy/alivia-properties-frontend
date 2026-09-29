const YOUTUBE_ID = /^[\w-]{11}$/
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"])
const YOUTUBE_PATH_PREFIXES = ["embed", "shorts", "live"]
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"])
const VIMEO_HASH = /^\w+$/
const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"])
const FACEBOOK_VIDEO_PATH = /^\/(?:watch\/?$|reel\/|share\/[vr]\/|[^/]+\/videos\/)/
const DIRECT_FILE = /\.(mp4|webm|ogg|m4v|mov)$/i

/** How a pasted product video link should be shown: inline embed, native player, or a plain outbound link. */
export type VideoLink =
  | { kind: "embed"; provider: "YouTube" | "Vimeo" | "Facebook"; src: string }
  | { kind: "file"; src: string }
  | { kind: "link"; href: string }

function parseHttpUrl(input?: string | null): URL | null {
  if (!input) return null
  try {
    const url = new URL(input.trim())
    return url.protocol === "https:" || url.protocol === "http:" ? url : null
  } catch {
    return null
  }
}

function youTubeId(url: URL): string | null {
  let id: string | null = null
  if (url.hostname === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    const [first, second] = url.pathname.split("/").filter(Boolean)
    if (first === "watch") id = url.searchParams.get("v")
    else if (first && YOUTUBE_PATH_PREFIXES.includes(first)) id = second ?? null
  }
  return id && YOUTUBE_ID.test(id) ? id : null
}

function vimeoEmbed(url: URL): string | null {
  if (!VIMEO_HOSTS.has(url.hostname)) return null
  const segments = url.pathname.split("/").filter(Boolean)
  const at = segments.findIndex((segment) => /^\d+$/.test(segment))
  if (at === -1) return null
  const hash = url.searchParams.get("h") ?? segments[at + 1]
  return `https://player.vimeo.com/video/${segments[at]}${hash && VIMEO_HASH.test(hash) ? `?h=${hash}` : ""}`
}

function facebookEmbed(url: URL): string | null {
  const isVideo =
    url.hostname === "fb.watch" ? url.pathname.length > 1 : FACEBOOK_HOSTS.has(url.hostname) && FACEBOOK_VIDEO_PATH.test(url.pathname)
  return isVideo
    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.toString())}&show_text=false`
    : null
}

/** True for any well-formed http(s) URL — the only rule the product "video link" field enforces. */
export function isValidVideoLink(input?: string | null): boolean {
  return parseHttpUrl(input) !== null
}

export function resolveVideoLink(input?: string | null): VideoLink | null {
  const url = parseHttpUrl(input)
  if (!url) return null

  const ytId = youTubeId(url)
  if (ytId) return { kind: "embed", provider: "YouTube", src: `https://www.youtube.com/embed/${ytId}` }

  const vimeo = vimeoEmbed(url)
  if (vimeo) return { kind: "embed", provider: "Vimeo", src: vimeo }

  const facebook = facebookEmbed(url)
  if (facebook) return { kind: "embed", provider: "Facebook", src: facebook }

  if (DIRECT_FILE.test(url.pathname)) return { kind: "file", src: url.toString() }

  return { kind: "link", href: url.toString() }
}
