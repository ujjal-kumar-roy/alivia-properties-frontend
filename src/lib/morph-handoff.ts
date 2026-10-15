/**
 * Hand-off for the card photo -> detail hero morph across loading skeletons.
 *
 * A card photo and the detail page's hero share a <ViewTransition name>, so
 * React morphs one into the other on navigation. But the first thing a tap
 * commits is a route loading skeleton (the detail page's own, or the listing
 * / site / root one above it, whichever Next has ready), and a skeleton has no
 * element with that name: the card photo just vanishes, and by the time the
 * real hero streams in the card is long gone. So a tapped card notes here which
 * photo it showed; <MorphLoading> turns any of those skeletons into the detail
 * skeleton, whose <MorphPlaceholder> shows that photo under the same name in
 * the hero slot. React then morphs card -> placeholder, and later placeholder
 * -> real hero, which sits in the same box.
 *
 * Plain module state: one tap at a time, nothing re-renders on it, nothing is
 * stored. On the server it is never set (only click handlers write it).
 */

export type MorphHandoff = {
  /** The <ViewTransition name> the card photo carries and the hero uses: `<kind>-<slug>`. */
  name: string
  /** `apartment`, `property`, ...: which detail skeleton to show. */
  kind: string
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
 * The card's cover: its largest loaded <img> (a seller avatar or badge icon is
 * smaller). One still loading, or broken, would show as a blank or broken
 * placeholder, so then there is no hand-off and the skeleton shows its block.
 */
function cardPhoto(link: HTMLAnchorElement) {
  let photo: HTMLImageElement | null = null
  let area = 0
  for (const img of (link.closest("article") ?? link).querySelectorAll("img")) {
    if (!img.complete || img.naturalWidth === 0) continue
    const box = img.getBoundingClientRect()
    if (box.width * box.height > area) {
      photo = img
      area = box.width * box.height
    }
  }
  return photo
}

/**
 * Called synchronously from a card link's click (a tap, a mouse click and
 * Enter all fire one), before Next starts the navigation.
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
  const src = cardPhoto(link)?.currentSrc
  if (!src) return
  pending = {
    name,
    kind: name.slice(0, name.indexOf("-")),
    src,
    pathname: url.pathname,
    at: performance.now(),
  }
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

/**
 * Hand-offs a placeholder already showed. The first placeholder is where the
 * card photo flies to; a later one (the detail page's own skeleton after the
 * listing's) takes over in place.
 */
const landed = new WeakSet<MorphHandoff>()

export function markMorphLanded(handoff: MorphHandoff) {
  landed.add(handoff)
}

export function morphLanded(handoff: MorphHandoff) {
  return landed.has(handoff)
}

/** Drop a hand-off once its skeleton is gone (the real page took over, or the visitor left). */
export function forgetMorph(handoff: MorphHandoff) {
  if (pending === handoff) pending = null
}

/**
 * Whether the navigation now committing is back/forward. A popstate starts
 * one; the next click or pushed entry ends it. (The Navigation API's own type
 * is no use here: Next's history sync turns every commit into a "replace"
 * before layout effects run.) Capture on window, so it sees the event even if
 * another capture listener holds it and dispatches it again later.
 */
let traversing = false
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    traversing = true
  }, true)
  window.addEventListener("click", () => {
    traversing = false
  }, true)
  const navigation = (window as Window & { navigation?: EventTarget }).navigation
  navigation?.addEventListener("navigate", (event) => {
    if ((event as Event & { navigationType?: string }).navigationType === "push") traversing = false
  })
}

export function isHistoryTraversal() {
  return traversing
}
