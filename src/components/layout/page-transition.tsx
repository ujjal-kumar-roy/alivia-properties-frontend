"use client"

import { ViewTransition, useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"

/**
 * Routes outside the customer-facing site (dashboards, auth). Navigating into
 * one of them must not play the page slide: the old page just swaps out.
 */
const APP_ONLY_ROUTE = /^\/(admin|seller|buyer|login|register|forgot-password|verify-email|unauthorized)(\/|$)/

type NavDir = "forward" | "back" | "none"

function setNavDir(dir: NavDir) {
  document.documentElement.dataset.navDir = dir
}

function dirFor(pathname: string, dir: Exclude<NavDir, "none">): NavDir {
  return APP_ONLY_ROUTE.test(pathname) ? "none" : dir
}

/**
 * Tags the next navigation's direction on <html data-nav-dir> so the
 * ::view-transition rules in globals.css can pick the slide direction.
 *
 * React transition types (Link `transitionTypes`) only cover links we tag by
 * hand and never reach browser back/forward or the iOS swipe-back gesture, so
 * direction is read from the events instead: a click (link or button that
 * pushes a route) is forward, a history traversal (popstate) is back. When the
 * browser already animated the traversal itself (iOS swipe-back), we play
 * nothing on top of it.
 */
function useNavDirection() {
  useEffect(() => {
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
    const onPopState = (event: PopStateEvent) => {
      // location already points at the destination entry here.
      setNavDir(event.hasUAVisualTransition ? "none" : dirFor(location.pathname, "back"))
    }
    // Capture on window so the direction is set before Link's own click handler
    // starts the navigation transition.
    window.addEventListener("click", onClick, true)
    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", onPopState)
    }
  }, [])
}

/**
 * App-like route transition for customer-facing pages. Keyed by pathname, so
 * only a route change enters/exits the boundary (and animates); in-page
 * transitions, search-param filters and Suspense reveals inside stay still
 * (`default="none"`). Persistent chrome (site header, chat launcher) lives
 * outside this boundary and is held in place by its own view-transition name.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  useNavDirection()

  return (
    <ViewTransition key={pathname} enter="page-nav" exit="page-nav" default="none">
      <div>{children}</div>
    </ViewTransition>
  )
}
