# Landing Motion Plan (2026-10-15)

Spec: user brief "Interactive Landing Page Enhancement with Three.js" + "most clients are mobile; it should feel like an interactive app".
Landing page = `/` which renders `src/app/marketplace/page.tsx`.

## Global Constraints

- pnpm only. Next.js 16.2.4, React 19.2.4, Tailwind v4 tokens (`brand-*`, `gold-*`, `ink-*`). Light mode only.
- Motion library already installed: `motion` (import from `"motion/react"`). `MotionConfig reducedMotion="user"` wraps the app (`src/components/providers/motion-provider.tsx`). Springs live in `src/lib/motion.ts` (`springs.move`, `springs.snappy`). Reuse them; do not add dependencies.
- Mobile first: touch targets >= 44px (min-h-11 / min-h-9 where the existing control already uses it), no horizontal page overflow at 360px, no hover-only affordances.
- Respect `prefers-reduced-motion` (MotionConfig handles motion components; CSS needs `motion-reduce:`).
- Never import `src/data/*` in components. Keep existing markup/a11y (aria-pressed, labels, focus rings).
- `pnpm lint` and `npx tsc --noEmit` must pass.

## Task 1: Hero three.js scene (DONE by controller, commit a925ee2)

## Task 2: Flagship projects filter feels like a native segmented control

File: `src/pages-sections/home/flagship-projects.tsx` (component `FlagshipProjects`).

1. Status filter group (All / Ongoing / Upcoming / Completed): replace the per-button background swap with a single sliding active pill shared across buttons using `motion` `layoutId` (e.g. `<motion.span layoutId="flagship-filter-pill" transition={springs.move} className="absolute inset-0 rounded-xl bg-brand-700 shadow-sm" />` rendered inside the active button, button `relative`, label `relative z-10`). Active label white, inactive `text-ink-600 hover:text-ink-900`. Keep `aria-pressed`, `role="group"`, focus ring, sizes.
2. Grid of cards: when the filter changes, cards animate position/size instead of snapping: wrap the `<ul>` items with `motion.li` using `layout` + `AnimatePresence mode="popLayout" initial={false}`; enter `{opacity:0, scale:0.96}` -> `{opacity:1, scale:1}`, exit reverse, `transition={springs.move}`. Keep the existing `reveal` class only if it does not fight the motion transform — move `reveal` to an inner wrapper div if needed (`.reveal` must not sit on an element with its own transform; see globals.css comment).
3. Add a short haptic tap on filter change using existing `haptic("tap")` from `@/lib/celebrate` (already used by `src/components/home/guided-start.tsx`).
4. No change to card component `FlagshipProjectCard` or the empty state.
