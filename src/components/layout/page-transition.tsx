"use client"

import { ViewTransition, useEffect, useLayoutEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"

/**
 * Routes outside the customer-facing site (dashboards, auth). Navigating into
 * one of them must not play the page slide: the old page just swaps out.
 */
const APP_ONLY_ROUTE = /^\/(admin|seller|buyer|login|register|forgot-password|verify-email|unauthorized)(\/|$)/

/** Width (px) of the screen edges where iOS starts its swipe-back gesture. */
const EDGE_SWIPE_ZONE = 24
/** A history traversal this soon after an edge swipe ends was the swipe. */
const EDGE_SWIPE_GRACE_MS = 700
/** Longest the screen stays frozen on the old page while waiting for the router. */
const TRAVERSE_COMMIT_TIMEOUT_MS = 800

type NavDir = "forward" | "back" | "none"

/** The bit of the Navigation API we use (not in TypeScript's DOM lib yet). */
type NavigationLike = {
  currentEntry: { index: number; url: string | null } | null
  addEventListener(type: "navigate", listener: (event: NavigateEventLike) => void): void
  removeEventListener(type: "navigate", listener: (event: NavigateEventLike) => void): void
}
type NavigateEventLike = Event & {
  navigationType: "push" | "replace" | "reload" | "traverse"
  destination: { index: number }
}

function setNavDir(dir: NavDir) {
  document.documentElement.dataset.navDir = dir
}

function dirFor(pathname: string, dir: Exclude<NavDir, "none">): NavDir {
  return APP_ONLY_ROUTE.test(pathname) ? "none" : dir
}

// Module state shared by whichever PageTransition is mounted ((site), marketplace
// or /): only one is mounted at a time, and a history traversal outlives the
// instance that started it.
/** Pathname the last committed PageTransition rendered (lags the URL during a commit). */
let committedPathname: string | null = null
/** A held history traversal: the pathname it goes to, and how to release it. */
let traverseTarget: string | null = null
let resolveTraverseCommit: (() => void) | null = null
/** Bumped by every history traversal; a held one only replays if still current. */
let traverseSeq = 0
/** The view transition PageTransition started for the current traversal. */
let activeTraverse: ViewTransition | null = null
let redispatching = false

/**
 * react-dom keeps its in-flight view transition here and, before committing a
 * view-transition-eligible update, waits for `.finished` of whatever is stored
 * (react-dom 19.2 `suspendOnActiveViewTransition`). We read it to wait for
 * React's transition, and publish ours in it so React waits for ours instead
 * of starting a new one that would skip it. Undocumented: if a React version
 * drops it, nothing breaks, the two transitions just stop coordinating.
 */
type ReactViewTransitionDocument = Document & { __reactViewTransition?: ViewTransition | null }

function releaseTraverse() {
  resolveTraverseCommit?.()
  resolveTraverseCommit = null
  traverseTarget = null
}

/** End the current traversal transition (if any) and drop its hold and styles. */
function cancelTraverse() {
  const transition = activeTraverse
  activeTraverse = null
  const doc = document as ReactViewTransitionDocument
  if (transition && doc.__reactViewTransition === transition) doc.__reactViewTransition = null
  delete document.documentElement.dataset.navTraverse
  releaseTraverse()
  transition?.skipTransition()
}

const ignore = () => {}

/**
 * Tags each navigation's direction on <html data-nav-dir> for the
 * ::view-transition rules in globals.css, and makes history traversals animate.
 *
 * Direction: a click (link, or a button that router.push()es) is forward. A
 * history traversal is back, or forward when the Navigation API says the
 * destination entry is ahead. A traversal the browser already animated (iOS /
 * Android swipe-back) plays nothing on top. React transition types (Link
 * `transitionTypes`) would only cover links tagged by hand and never the back
 * button or gesture, which is how phone users go back.
 *
 * Traversals: Next 16 applies a popstate navigation with a plain setState from
 * a promise callback (its action queue is async), outside any React
 * Transition, so React never starts a view transition for back/forward. We
 * start one ourselves: hold Next's popstate handler, let the browser capture
 * the current page, then replay the popstate inside the view transition's
 * update callback and resolve it once the new route has committed.
 */
function useNavDirection() {
  useEffect(() => {
    const navigation = (window as Window & { navigation?: NavigationLike }).navigation
    let traverseDir: Exclude<NavDir, "none"> | null = null
    let traverseFrom: string | null = null
    let edgeTouch = false
    let edgeReleasedAt = -Infinity

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const anchor = target?.closest<HTMLAnchorElement>("a[href]")
      if (!anchor) {
        // Buttons that navigate with router.push() are forward moves too.
        setNavDir("forward")
        return
      }
      const url = new URL(anchor.href, location.href)
      setNavDir(url.origin === location.origin ? dirFor(url.pathname, "forward") : "none")
    }

    const onNavigate = (event: NavigateEventLike) => {
      // Fires before popstate, while currentEntry is still the page we leave.
      if (event.navigationType !== "traverse") return
      const from = navigation?.currentEntry
      traverseDir = from && event.destination.index > from.index ? "forward" : "back"
      traverseFrom = from?.url ? new URL(from.url).pathname : null
    }

    const onTouchStart = (event: TouchEvent) => {
      const x = event.touches[0]?.clientX ?? EDGE_SWIPE_ZONE
      edgeTouch = x < EDGE_SWIPE_ZONE || x > window.innerWidth - EDGE_SWIPE_ZONE
    }
    const onTouchEnd = () => {
      if (edgeTouch) edgeReleasedAt = performance.now()
      edgeTouch = false
    }

    const onPopState = (event: PopStateEvent) => {
      if (redispatching) return
      // location already points at the destination entry here.
      const swiped =
        event.hasUAVisualTransition ||
        edgeTouch ||
        performance.now() - edgeReleasedAt < EDGE_SWIPE_GRACE_MS
      const to = location.pathname
      const dir: NavDir = swiped ? "none" : dirFor(to, traverseDir ?? "back")
      // The page we are leaving. The Navigation API's entry is exact; the
      // committed pathname is only a fallback, since it lags the URL while a
      // navigation commits (React defers layout effects inside a view
      // transition, up to 500ms while fonts/images load).
      const from = traverseFrom ?? committedPathname
      traverseDir = null
      traverseFrom = null

      const state: unknown = event.state
      const animate =
        dir !== "none" &&
        typeof document.startViewTransition === "function" &&
        // Only entries the app router owns; Next reloads or ignores the rest.
        typeof state === "object" && state !== null && "__NA" in state &&
        // Same path (hash / search change): no route change to wait for.
        to !== from
      // Reduced motion is not a reason to skip: like link navigations, the
      // transition still runs and globals.css zeroes its animations.

      // A newer traversal supersedes a held one: it must not replay its stale
      // popstate (Next would restore the old tree at the new URL).
      const seq = ++traverseSeq
      cancelTraverse()
      if (!animate) {
        setNavDir(dir)
        return
      }

      // Hold Next's handler (and any other popstate listener) until the
      // current page has been captured.
      event.stopImmediatePropagation()
      const doc = document as ReactViewTransitionDocument

      const start = () => {
        if (seq !== traverseSeq) return // superseded while waiting
        setNavDir(dir)
        const root = document.documentElement
        root.dataset.navTraverse = ""
        traverseTarget = to
        const committed = new Promise<void>((resolve) => {
          resolveTraverseCommit = resolve
          window.setTimeout(resolve, TRAVERSE_COMMIT_TIMEOUT_MS)
        })
        const transition = document.startViewTransition(() => {
          // Skipped before it got here and superseded: the newer traversal
          // replays its own popstate.
          if (seq !== traverseSeq) return
          redispatching = true
          try {
            window.dispatchEvent(new PopStateEvent("popstate", { state }))
          } finally {
            redispatching = false
          }
          return committed
        })
        activeTraverse = transition
        doc.__reactViewTransition = transition
        // A skipped transition rejects `ready` (AbortError); nothing to do then.
        transition.ready.catch(ignore)
        transition.updateCallbackDone.catch(ignore)
        const done = () => {
          if (doc.__reactViewTransition === transition) doc.__reactViewTransition = null
          if (activeTraverse !== transition) return // a newer traversal owns the state
          activeTraverse = null
          delete root.dataset.navTraverse
          releaseTraverse()
        }
        transition.finished.then(done, done)
      }

      // Starting ours while React's link-navigation transition is still
      // running would skip React's mid-flight; start right after it instead.
      const running = doc.__reactViewTransition
      if (running) running.finished.then(start, start)
      else start()
    }

    // Capture on window so the direction is set (and a traversal held) before
    // Link's click handler or Next's popstate handler runs.
    window.addEventListener("click", onClick, true)
    window.addEventListener("popstate", onPopState, true)
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true })
    window.addEventListener("touchend", onTouchEnd, { capture: true, passive: true })
    window.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true })
    navigation?.addEventListener("navigate", onNavigate)
    return () => {
      window.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", onPopState, true)
      window.removeEventListener("touchstart", onTouchStart, true)
      window.removeEventListener("touchend", onTouchEnd, true)
      window.removeEventListener("touchcancel", onTouchEnd, true)
      navigation?.removeEventListener("navigate", onNavigate)
    }
  }, [])
}

/**
 * App-like route transition for customer-facing pages. Keyed by pathname, so
 * only a route change enters/exits the boundary (and animates); in-page
 * transitions, search-param filters and Suspense reveals inside stay still
 * (`default="none"`). Persistent chrome (site header, chat launcher, cookie
 * banner, open mobile menu) lives outside this boundary and is held in place
 * by its own transition-only view-transition-name (globals.css).
 *
 * Note: the key remounts everything under the layout on each pathname change.
 * Fine while (site) and marketplace have no nested layouts; a future nested
 * layout with client state would lose it on sibling navigations.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  useNavDirection()

  // The new route is on screen: release a held history traversal.
  useLayoutEffect(() => {
    committedPathname = pathname
    // Only the destination releases it: a late commit of an earlier navigation
    // must not end the freeze before the restored page is in the DOM.
    if (pathname === traverseTarget) releaseTraverse()
  }, [pathname])

  return (
    <ViewTransition key={pathname} enter="page-nav" exit="page-nav" default="none">
      <div className="vt-page">{children}</div>
    </ViewTransition>
  )
}
