/**
 * Hand-off for the card photo -> detail hero morph across a loading skeleton.
 *
 * A card photo and the detail page's hero share a <ViewTransition name>, so
 * React morphs one into the other on navigation. But a detail route with a
 * loading.tsx commits its skeleton first, and the skeleton has no element with
 * that name: the card photo just vanishes, and by the time the real hero
 * streams in the card is long gone. So a tapped card notes here which photo it
 * showed, and <MorphPlaceholder> in the destination skeleton shows that photo
 * under the same name in the hero slot. React then morphs card -> placeholder,
 * and later placeholder -> real hero, which sits in the same box.
 *
 * Plain module state: one tap at a time, nothing re-renders on it, nothing is
 * stored. On the server it is never set (only click handlers write it).
 */

export type MorphHandoff = {
  /** The <ViewTransition name> the card photo carries and the hero uses. */
  name: string
  /** The URL the card's <img> is showing (its picked srcset candidate), already in memory. */
  src: string
  /** Pathname the tap navigates to. */
  pathname: string
  at: number
}

/**
 * A tap that never reached a skeleton (the page was already cached, the
 * navigation was cancelled) must not resurface on a later visit to that page.
 * Tap to skeleton is instant with a prefetched loading state and a few seconds
 * on a slow first fetch; past this the skeleton just shows its plain block.
 */
const MAX_AGE_MS = 8_000

let pending: MorphHandoff | null = null

type ClickLike = Pick<
  MouseEvent,
  "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented"
>

/**
 * Called synchronously from a card link's click (a tap, a mouse click and
 * Enter all fire one), before Next starts the navigation. The photo is the
 * first <img> of the card (`<article>`), which is the cover every card names.
 */
export function rememberMorph(link: HTMLAnchorElement, event: ClickLike, name: string) {
  // Modified clicks open a new tab or window: no in-page navigation to morph.
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    (link.target && link.target !== "_self")
  ) {
    return
  }
  const url = new URL(link.href, location.href)
  if (url.origin !== location.origin) return
  const img = (link.closest("article") ?? link).querySelector("img")
  const src = img?.currentSrc || img?.src
  if (!src) return // the card shows its no-photo fallback
  pending = { name, src, pathname: url.pathname, at: performance.now() }
}

function samePath(a: string, b: string) {
  try {
    return decodeURI(a) === decodeURI(b)
  } catch {
    return a === b
  }
}

/** The photo a card handed to `pathname`, if one was tapped just now. */
export function morphFor(pathname: string): MorphHandoff | null {
  if (!pending) return null
  if (performance.now() - pending.at > MAX_AGE_MS || !samePath(pending.pathname, pathname)) {
    return null
  }
  return pending
}

/** Drop a hand-off once its skeleton is gone (the real page took over, or the visitor left). */
export function forgetMorph(handoff: MorphHandoff) {
  if (pending === handoff) pending = null
}

/** Type of the latest navigation, where the browser has the Navigation API. */
let lastNavigationType: string | null = null
if (typeof window !== "undefined") {
  const navigation = (window as Window & { navigation?: EventTarget }).navigation
  navigation?.addEventListener("navigate", (event) => {
    lastNavigationType = (event as Event & { navigationType?: string }).navigationType ?? null
  })
}

/** Back/forward (history traversal): the browser restores the scroll offset itself. */
export function lastNavigationWasTraverse() {
  return lastNavigationType === "traverse"
}
