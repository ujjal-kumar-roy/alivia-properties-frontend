# Site-wide Motion Plan (2026-10-15)

Spec: user brief "Interactive Landing Page Enhancement with Three.js" (purposeful motion, performance, accessibility, reduced motion) + follow-ups: "most clients are mobile; it should feel like an interactive app rather than a website" and "animate all customer-facing pages, not just the landing page".

Previous plan `2026-10-15-landing-motion.md` (hero three.js scene, flagship filter) is DONE — do not touch `src/components/home/hero-scene.tsx`.

## Global Constraints

- pnpm only (`/opt/homebrew/bin/pnpm`; never install new packages unless a task says so). Next.js 16.2.4 App Router, React 19.2.4, Tailwind v4 tokens (`brand-*`, `gold-*`, `ink-*`), light mode only. Read `node_modules/next/dist/docs/` for any Next API you use — this Next version differs from training data.
- Existing motion toolkit — reuse, don't duplicate:
  - CSS scroll reveals in `src/app/globals.css`: `.reveal`, `.reveal-pop`, `.reveal-stagger` (children cascade). Compositor-only, no JS, visible by default. Never put them on an element that has its own transform (hover lift/press scale) — wrap instead. Never inside horizontal scrollers.
  - `motion` library (`import ... from "motion/react"`), app wrapped in `<MotionConfig reducedMotion="user">`; springs in `src/lib/motion.ts` (`springs.move`, `springs.snappy`, `springs.sheet`).
  - `CountUp` (`src/components/common/count-up.tsx`), `haptic()` (`src/lib/celebrate.ts`), `.pressable`, `.btn-tactile`, `.glass-chip` classes.
- Prefer CSS / scroll-driven reveals for Server Components (no `"use client"` just for animation). Use `motion` only for state-driven UI (tabs, steps, lists that change).
- Mobile first: tap feedback on every tappable card/button (`active:scale-[0.98]` or `.pressable`), touch targets >= 44px, no horizontal page overflow at 360px, no hover-only affordances.
- Reduced motion: every new animation must be disabled or reduced to a fade under `prefers-reduced-motion: reduce`.
- Content must never depend on animation to become visible (no opacity:0 end states without JS fallback).
- Don't change data flow, copy, routes, or markup semantics/a11y (aria, labels, focus rings). Don't edit `src/components/ui/*`.
- Match file style (some files use semicolons, some don't). Verification for every task: `npx tsc --noEmit -p .` and `npx eslint <changed paths>` clean; dev server at http://localhost:3002 returns 200 for each touched route (do not restart it).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Task 1: App-like page navigation with View Transitions

Enable Next 16 view transitions (`experimental.viewTransition: true` in `next.config.ts`; read `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` and `.../05-config/01-next-config-js/viewTransition.md` first).

1. Route-level transition for customer-facing routes: wrap page content of `src/app/(site)/layout.tsx` children and the marketplace pages (they have no shared layout — find the least-invasive wrapping point, e.g. a `src/app/marketplace/layout.tsx` that only renders children inside the transition) so navigations animate. Header/footer must NOT animate (persist) — give persistent chrome its own `view-transition-name` or keep it outside the wrapper.
2. Motion: on phones a short app-like slide (new page enters from the right ~24px + fade, old fades) for forward navigation and the reverse for back navigation (use the directional pattern from the guide, e.g. `transitionTypes` / `addTransitionType` if available in this version; if direction is not feasible, use a subtle fade + 8px rise for both and record why in the report). Duration 220–320ms, ease-out.
3. Reduced motion: `::view-transition-*` animations disabled under `prefers-reduced-motion: reduce`.
4. Dashboards (`(dashboard)`) and auth are out of scope for this task — must not be affected.

## Task 2: Shared-element morphs from cards to detail pages

Using `<ViewTransition name=...>` (Task 1 enabled it), morph the card image into the detail page hero image for:
- Apartment (project) card → `/apartments/[slug]` hero/gallery main image (cards: `FlagshipProjectCard` in `src/pages-sections/home/flagship-projects.tsx` and whatever card `/apartments` listing renders).
- Property card (`src/components/properties/property-card.tsx` and any list variant) → `/properties/[slug]` main gallery image.
- Marketplace product card → `/marketplace/product/[slug]` main image; supplier card → `/marketplace/supplier/[slug]` cover.
Names must be unique per item on a page (e.g. `apartment-${slug}`); if the same item can appear twice on one page, only one instance may carry the name. Keep the title text morph optional. Must not break image `priority`/LCP on detail pages.

## Task 3: Real-estate pages — reveals, staggers, tap feedback

Pages: `/apartments`, `/apartments/[slug]`, `/properties`, `/properties/[slug]`, `/agents`, `/agents/[slug]`, `/about-us`, `/blog`, `/blog/[slug]`, `/contact-us`, `/consultation`, `/compare`, `/map-search`, `/partner/[type]`, `/pre-approval`, `/moving-checklist`, `/notifications`, `/privacy`, `/terms`.
For each: page header entrance (eyebrow/title/lead cascade, reuse a single shared CSS class pattern like the landing `.hero-copy` — generalize it to e.g. `.enter-cascade` in globals.css rather than copying), section reveals (`.reveal` / `.reveal-stagger`) on below-the-fold sections and card grids, `CountUp` on numeric stats where a real number is shown, consistent tap feedback on cards. Tabs/segmented controls that switch content: sliding indicator with `motion` `layoutId` like `flagship-projects.tsx`. Keep it restrained — legal pages (privacy/terms) get header entrance only. Skip any page section already animated.

## Task 4: Marketplace pages — reveals, wizard steps, success moment

Pages: `/marketplace/category/[slug]`, `/marketplace/product/[slug]`, `/marketplace/supplier/[slug]`, `/marketplace/quote` (QuoteWizard in `src/components/marketplace/wizard/`), `/marketplace/request`, `/marketplace/quote/thank-you`.
1. Same header cascade + reveals + tap feedback treatment as Task 3 (reuse its classes).
2. Quote wizard: animate step changes directionally (next = slide from right, back = from left) with `motion` `AnimatePresence mode="popLayout"`/`custom` direction; progress bar animates width with a spring; focus management unchanged.
3. Thank-you page: a short, tasteful success moment (check icon draw/scale-in with `springs`, optional `haptic("success")` on mount) — no confetti storms, reduced-motion safe.

## Task 5: Auth pages

`/login`, `/register`, `/forgot-password`, `/verify-email`: card entrance (fade + 12px rise), field-group cascade, error message reveal (height/opacity via `motion` or CSS), submit button loading state transitions smoothly. No changes to auth logic.
