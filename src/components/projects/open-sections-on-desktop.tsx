"use client"

import { useEffect } from "react"

/**
 * From `lg` the page sections stop being accordions (see <ProjectSection>):
 * their content is already forced visible by CSS, and this keeps each
 * `<details>` genuinely open too, so screen readers do not announce a visible
 * section as collapsed. Renders nothing; it only syncs `open` with the
 * breakpoint, including when a window is resized across it.
 */
export function OpenSectionsOnDesktop({ containerId }: { containerId: string }) {
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)")
    const sync = () => {
      if (!query.matches) return
      document
        .querySelectorAll<HTMLDetailsElement>(`#${containerId} > details`)
        .forEach((section) => {
          section.open = true
        })
    }
    sync()
    query.addEventListener("change", sync)
    return () => query.removeEventListener("change", sync)
  }, [containerId])

  return null
}
