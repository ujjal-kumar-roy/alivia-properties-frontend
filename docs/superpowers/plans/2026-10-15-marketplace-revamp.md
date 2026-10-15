# Marketplace Category + Product Revamp (2026-10-15)

Spec / product truth: `PRODUCT.md` (repo root). Data facts: `.superpowers/sdd/2026-10-15-marketplace-revamp/recon-data.md`.
Direction (user-chosen): **standard shop layout executed at high craft** — benchmarks the user named: **Amazon** (dense, scannable facts, quantity selector, more-from-seller, recently viewed), **Apple Store app** (premium spacing, restrained motion, smooth sheets), **Daraz** (familiar Bangladeshi marketplace patterns: filter/sort sheets, 2-col phone grid, sticky buy bar). Mode: Operate (shopping task). Audience: homeowners + contractors equally, mostly phones.

## Global Constraints

- Next.js 16.2.4 App Router (`params`/`searchParams` are Promises; keep `export const dynamic = "force-dynamic"` on these pages), React 19.2, Tailwind v4 tokens (`brand-*` emerald, `gold-*`, `ink-*`), light mode only, fonts unchanged (Cinzel `font-heading` for page/product titles only; Manrope for all UI, labels, prices, data). pnpm only, no new dependencies.
- Data only through `src/services/marketplace.service.ts` (+ `quotes` service). Never import `src/data/*` in components. Product list API accepts only `page, limit(≤100), search, sort, category, supplierId, kind`.
- Honest data: never invent ratings, reviews, stock levels or claims. Price `0` means "Ask for price" (never show ৳0). Do NOT show the "Best Seller" badge on grid cards or list rows (it is on ~99% of products, so it is noise); the product page may show `product.badge` once as small quiet text. Normalise `brand` with `.trim()`. Units are messy ("Pcs", "pcs", "unit") — display as given.
- Plain copy: "Ask for a price", "Add to quote list", "Sellers" (not "Suppliers") in buyer-facing UI.
- Craft floor (impeccable): no eyebrow/kicker labels above headings (remove existing `text-eyebrow` uses in these pages), no decorative glass, no gradient text, no nested cards, no colored border-left accents, no emoji/unicode icons (lucide only), every control has hover (gated), focus-visible, active, disabled, loading states; skeletons instead of spinners for content loading; empty states that teach.
- Motion (Emil Kowalski rules — exact values):
  - Easing tokens (controller adds to `src/app/globals.css` `:root`): `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`. Use via Tailwind arbitrary values, e.g. `ease-(--ease-out)`. Never `ease-in` for UI. Never `transition: all` / `transition-all` — list exact properties.
  - Durations: press feedback 140ms; small UI state (chips, toggles, counts) 160–220ms; sheets/drawers 320ms with `--ease-drawer`; nothing in UI over 300ms except the add-to-quote flight (≤450ms).
  - Press: pressable buttons `active:scale-[0.97]`, whole cards `active:scale-[0.98]`, `transition-[scale] duration-140 ease-(--ease-out)`, `motion-reduce:active:scale-100`.
  - Hover effects only inside `@media (hover:hover) and (pointer:fine)` — in Tailwind use the `[@media(hover:hover)_and_(pointer:fine)]:hover:` variant or the project's existing pattern; image hover zoom max `scale-[1.03]`, 300ms ease-out.
  - Entering elements start at `opacity:0` + `translateY(8px)` or `scale(0.95)` — never `scale(0)`. Stagger 40ms between items, max 8 items staggered per batch.
  - Dynamic/rapid UI (counts, toggles, steppers) uses CSS transitions or `motion` springs (interruptible), not keyframes. `motion` springs: `springs.snappy` / `springs.move` from `src/lib/motion.ts`.
  - `motion` props: prefer `transform` strings over `x`/`y` shorthands for anything that animates while data loads.
  - No orchestrated page-load sequences on these two pages (page transitions already exist); do not add `.enter-cascade` here. `.reveal`/`.reveal-stagger` allowed only for below-the-fold vertical sections, never on transformed elements, never in horizontal scrollers.
  - Keyboard-initiated actions (Enter/arrow keys) apply instantly — no animation.
  - Reduced motion: keep opacity/color fades (≤150ms), drop transforms/flights; `MotionConfig reducedMotion="user"` covers motion components; CSS needs `motion-reduce:` variants.
- Mobile first: touch targets ≥44px, no horizontal page overflow at 360px, thumb-reachable primary actions (MobileActionBar), safe-area aware.
- Shared-element morphs already exist: product card image and product hero carry `ViewTransition name={\`product-${slug}\`}` (+ a click "handoff" being added by a separate in-flight task in `src/lib/morph-handoff.ts`). Keep them working; a name may appear once per page (use the card's `morph={false}` prop for duplicates, e.g. recently-viewed rail).
- The live dev server is the USER'S at http://localhost:3001 connected to the PRODUCTION API: GET only. Never submit forms, never POST/PATCH/DELETE (a submitted quote reaches real sellers).
- Verification per task: `npx tsc --noEmit -p .` (errors only in your files count; missing-module errors for modules another task in this plan creates are expected until the wave lands — list them) and `npx eslint <your files>`; curl your routes on :3001 for 200.

## Shared contracts (all tasks code against these exactly)

```ts
// src/lib/quote-list.ts  (Task 1)
export type QuoteListItem = {
  productId: string; slug: string; name: string; image: string;
  price: number; unit: string; moq?: number;
  supplierId?: string; supplierSlug?: string; supplierName?: string;
  qty: number; addedAt: number;
}
export const QUOTE_LIST_EVENT = "alivia:quote-list"
export function readQuoteList(): QuoteListItem[]          // SSR-safe, [] on server / parse error
// src/hooks/use-quote-list.ts  (Task 1)  — "use client"
export function useQuoteList(): {
  items: QuoteListItem[]; count: number; ready: boolean;   // ready=false until hydrated (render nothing count-dependent before)
  has(productId: string): boolean;
  add(item: Omit<QuoteListItem, "qty" | "addedAt"> & { qty?: number }): void; // merges qty if present
  remove(productId: string): void; setQty(productId: string, qty: number): void; clear(): void;
}
// storage key: LS_MARKETPLACE_CART from src/lib/constants.ts (exists, unused today)
// src/components/marketplace/quote-list/AddToQuoteButton.tsx (Task 1) — "use client"
export function AddToQuoteButton(props: {
  item: Omit<QuoteListItem, "qty" | "addedAt">; qty?: number;
  variant: "icon" | "full";            // icon = 44px round "+" on cards; full = wide primary button
  className?: string; flyFrom?: React.RefObject<HTMLElement | null>; // element whose image flies to the list button
}): JSX.Element
// src/components/marketplace/quote-list/QuoteListButton.tsx (Task 1) — header icon + animated count; links ROUTES.MARKETPLACE_CART; has data-quote-list-target for the flight
// src/components/marketplace/quote-list/QuoteListAction.tsx (Task 1) — for MobileActionBar: if count>0 renders `btn-tactile` link "Review quote list (n)" to ROUTES.MARKETPLACE_CART, else renders children (fallback CTA)

// src/lib/recent-products.ts + src/hooks/use-recent-products.ts (Task 10)
export type RecentProduct = { slug: string; name: string; image: string; price: number; unit: string; supplierName?: string; viewedAt: number }
// key "alivia_recent_products" (add LS_RECENT_PRODUCTS to src/lib/constants.ts — Task 10 owns that one-line edit), max 12, most recent first
export function RecentProductRecorder(props: { product: Omit<RecentProduct, "viewedAt"> }): null

// src/components/marketplace/product/BuyBox.tsx (Task 8) — "use client"
export function BuyBox(props: { product: ProductWithSupplier; serviceMode: boolean; quoteHref: string; call: string | null; whatsapp: string | null }): JSX.Element
// renders the in-page buy box AND the phone MobileActionBar (shared qty state) — page must not render its own MobileActionBar

// src/components/marketplace/product/ProductDetails.tsx (Task 10) — server
export function ProductDetails(props: { product: ProductWithSupplier; supplier?: DetailSupplier; serviceMode: boolean }): JSX.Element
// src/components/marketplace/product/ProductRail.tsx (Task 10) — server wrapper + client scroller
export function ProductRail(props: { title: string; href?: string; products: ProductWithSupplier[]; morph?: boolean }): JSX.Element | null
// src/components/marketplace/product/RecentlyViewedRail.tsx (Task 10) — "use client"; excludeSlug prop; renders nothing when <2 items
// DetailSupplier type: move the local type from product/[slug]/page.tsx to src/components/marketplace/product/types.ts (Task 7 creates; Task 10 imports)

// Category (Tasks 3–5)
// src/app/marketplace/category/[slug]/actions.ts (Task 5) — "use server"
export async function loadCategoryProducts(input: { category: string; page: number; sort?: string; kind?: "SUPPLIER" | "SERVICE"; search?: string }): Promise<Paginated<ProductWithSupplier>>
export async function loadCategorySuppliers(input: { category: string; page: number; sort?: string; kind?: "SUPPLIER" | "SERVICE"; search?: string }): Promise<Paginated<Supplier>>
// src/components/marketplace/category/ProductResults.tsx (Task 5) — "use client"
export function ProductResults(props: { initial: Paginated<ProductWithSupplier>; query: { category: string; sort?: string; kind?: "SUPPLIER" | "SERVICE"; search?: string }; nextHref: string | null }): JSX.Element
// src/components/marketplace/category/SupplierResults.tsx (Task 5) — same shape for suppliers (+ categorySlug)
// src/components/marketplace/category/CategoryToolbar.tsx (Task 4) — "use client"
export function CategoryToolbar(props: { basePath: string; view: ListingView; sort: SortKey; kind: KindKey; search: string; productTotal: number; supplierTotal: number }): JSX.Element
// layout preference (grid|list) lives in localStorage "alivia_mkt_layout" read via src/hooks/use-listing-layout.ts (Task 4 creates; Task 5 consumes: `useListingLayout(): ["grid"|"list", (l) => void]`)
// category-filters.ts gains `search` (URL param `q`) support in listingHref/parse (Task 4)
```

## Task 1: Quote list foundation

Own: `src/lib/quote-list.ts`, `src/hooks/use-quote-list.ts`, `src/components/marketplace/quote-list/{AddToQuoteButton,QuoteListButton,QuoteListAction}.tsx`, `src/components/marketplace/MarketplaceBreadcrumb.tsx` (add `QuoteListButton` at the right end of the sticky bar).
Build the contracts above. Store mirrors `src/hooks/use-save-property.ts` (SSR-safe empty init, custom event + `storage` listener). AddToQuoteButton states: idle "+" / "Add to quote list" → added "✓"/"In quote list" (tap again = open list link for `full`, toggle remove for `icon` with confirmation-free undo via re-tap). Motion: icon swap with opacity+scale(0.9→1)+blur(2px→0) 180ms ease-out; flight: clone `flyFrom` image (or the button) as a fixed-position element and animate it with WAAPI to the `[data-quote-list-target]` rect: transform translate+scale to 0.2, opacity 1→0.6, 450ms `--ease-in-out`, then the target's count badge bumps (scale 1→1.2→1, 220ms ease-out) — all transform/opacity only; skip flight under reduced motion or when target not on screen. `haptic("tap")` on add. Count badge renders only when `ready && count>0`. Accessible: button `aria-pressed`, live region announcing "Added {name} to quote list".

## Task 2: Quote list page + multi-product request

Own: `src/app/marketplace/cart/page.tsx` (new; route `ROUTES.MARKETPLACE_CART` exists), `src/components/marketplace/quote-list/QuoteListView.tsx` (new), `src/components/marketplace/GetQuoteForm.tsx`, `src/app/marketplace/quote/page.tsx`, `src/schemas/quote.schema.ts` (only if needed).
1. `/marketplace/cart` "Your quote list": rows (thumb, name link, seller, unit price or "Ask for price", qty stepper min `moq||1`, line estimate, remove with exit animation height+opacity 200ms), estimated total "Estimated total ৳X — sellers confirm final prices", empty state teaching how to add items (link back to marketplace). Below: the request form via `GetQuoteForm` in a new `items` mode.
2. `GetQuoteForm` `items` mode: same contact/delivery fields once; on submit send ONE `quotesService.create` per item sequentially with that item's `productId`, `quantity`, `unit` (and supplier), show per-item progress, then clear the submitted items from the list and redirect to the existing thank-you page (`?count=n` style like batch). Partial failure: keep failed items, show which failed. Do not change existing single/batch modes' behaviour.
3. `/marketplace/quote` accepts `qty` and `unit` params and prefills the form's quantity/unit fields.
NEVER submit the form against the live server while testing.

## Task 3: Category page shell

Own: `src/app/marketplace/category/[slug]/page.tsx` only.
Rewrite composition (keep data logic, department/category levels, notFound, fallbacks, metadata). Phone-first structure: `MarketplaceBreadcrumb` → header (no eyebrow, no gradient hero, no confidence cards): 56px rounded category image + `h1` (font-heading text-2xl sm:text-3xl) + one-line description (ink-600, line-clamp-2) + meta line "154 products · 1 seller" → sibling `ChipRail` → `CategoryToolbar` (Task 4; sticky under the breadcrumb bar) → `ProductResults`/`SupplierResults` (Task 5) with the first page fetched server-side (respect `q` search + sort + kind) and `nextHref` = `listingHref(..., page+1)` → related categories as a horizontal snap rail on phones / grid on desktop → `MobileActionBar` with `QuoteListAction` (Task 1) wrapping the existing "Ask for a price" wizard link + call button. Department level: header + category tiles grid (keep `CategoryImageCard`). Fetch only the active view's first page plus the other view's total (use `limit:1` for the inactive one) to cut API calls. Empty states: filtered-empty (clear filters) and truly-empty (ask for a price) using plain copy. Desktop: container-page max width, 4–5 column grid, toolbar inline.

## Task 4: Category toolbar, sort & filter sheets, layout toggle

Own: `src/components/marketplace/CategoryFilters.tsx`, `src/components/marketplace/category-filters.ts`, `src/components/marketplace/category/CategoryToolbar.tsx` (new), `src/hooks/use-listing-layout.ts` (new).
Toolbar (sticky, white/95 with hairline bottom border when stuck — no decorative glass): row 1 = segmented control Products n | Sellers n with a sliding pill (`motion` layoutId, `springs.snappy`), row 2 (phones) = search field "Search in {category}" (submits `q`, clear button, Enter submits instantly) + Sort button + Filters button (active count badge) + layout toggle (grid/list icons, sliding indicator). Desktop: one row. Sort opens a bottom sheet on phones (existing `GlassSheet` pattern from CategoryFilters) / a popover menu on desktop (origin-aware `transform-origin` from trigger, 180ms ease-out, scale 0.97→1 + opacity). Filters sheet keeps seller-type filter (plain labels: "All sellers / Material sellers / Service providers") and applies on "Show n results" (keep draft-then-apply). Navigation via `router.push` inside `startTransition`; expose pending state by setting `data-pending` on `document.documentElement`-independent element: render a context `CategoryPendingContext` OR simply set `aria-busy` on a wrapper id `category-results` — Task 5 dims results while `[aria-busy=true]` (opacity .55, 150ms). Sort options: Newest, Price low→high, Price high→low, Name A–Z (drop rating/reviews sorts: data is empty). Keep URLs short (defaults omitted).

## Task 5: Category results (infinite, grid/list, skeletons)

Own: `src/app/marketplace/category/[slug]/actions.ts` (new), `src/components/marketplace/category/{ProductResults,SupplierResults,ProductRow,ResultSkeletons}.tsx` (new), `src/components/marketplace/MarketplaceSupplierSummaryCard.tsx` (only if needed for the list, coordinate: a separate in-flight task may touch it for morph handoff — make minimal additive edits).
Server actions call `marketplaceService` (server side; no client CORS). `ProductResults`: renders initial items server-markup-identical (no hydration mismatch), grid (2/3/4/5 cols) using `MarketplaceProductCard` (Task 6) or list using `ProductRow` (dense Amazon-like row: 88px square thumb, name 2 lines, price/unit or "Ask for price", "MOQ n · Ships in n days · seller", `AddToQuoteButton variant="icon"`). Infinite load: IntersectionObserver sentinel (rootMargin 800px) calls the action for the next page; append with fade+translateY(8px) 220ms ease-out, 40ms stagger capped at 8; skeleton tiles (same aspect as cards, `animate-pulse` replaced by a gentle shimmer that is off under reduced motion) while loading; progressive enhancement: a real `<Link href={nextHref}>Show more</Link>` button that JS intercepts. Dedupe by id. End state: "You've seen all 154 products" + back-to-top. Error state with retry. Layout toggle grid↔list: crossfade 180ms (no per-item layout animation for large lists). When results' wrapper `#category-results[aria-busy=true]`, dim to .55 opacity (150ms). Reset list when query changes (key by query string).

## Task 6: Product card redesign (grid)

Own: `src/components/marketplace/MarketplaceProductCard.tsx`. Starts after the in-flight morph-handoff task lands (it edits this file).
Card: whole card is a link (keep `ViewTransition` morph + handoff registration), 1:1 image area `bg-ink-50` with `object-cover`, no caption overlay on the photo, no "Best Seller" badge; quick add `AddToQuoteButton variant="icon"` floating bottom-right of the image (sibling of the link, not nested inside `<a>`); body: name (text-sm font-semibold, 2 lines), muted line "brand · seller" (trim brand, dedupe when equal), price (text-lg font-extrabold tabular-nums ink-900 with `/ unit` muted; `price===0` → "Ask for price" brand-700), facts line "MOQ 500 bag · Ships in 1 day" text-xs ink-500 (omit MOQ when 1). Press `active:scale-[0.98]`; desktop hover: image `scale-[1.03]` 300ms ease-out + card shadow lift, gated to fine pointers. Keep props `product`, `className`, `morph`. Out-of-stock (if ever false): "On order" muted label.

## Task 7: Product page shell

Own: `src/app/marketplace/product/[slug]/page.tsx`, `src/app/marketplace/product/[slug]/haptic-link.tsx`, `src/components/marketplace/product/types.ts` (new; move `DetailSupplier` here).
Composition: breadcrumb trail Marketplace › {category} › {product} (category link via `product.category`/`categorySlug`). Phone: gallery (Task 9) edge-to-edge → title block (seller/brand line, `h1` font-heading text-xl, quiet badge text if present) → `BuyBox` (Task 8) → seller card → `ProductDetails` (Task 10) → rails. Desktop (lg): two columns `[minmax(0,1.15fr)_minmax(0,1fr)]`, gallery sticky left, right column title + BuyBox + seller card; details and rails full width below. Data: fetch product, then in parallel `listProducts({category: product.categorySlug, limit: 9})` (similar; filter out current id, take 8) and `listProducts({supplierId: product.supplierId, limit: 9})` (more from seller; filter out current and anything in similar, take 8); each fetch `.catch` to empty. Render `RecentProductRecorder` + `RecentlyViewedRail excludeSlug`. Remove the page's own MobileActionBar (BuyBox renders it). Keep `generateMetadata`, notFound handling, service-mode copy.

## Task 8: Buy box + sticky buy bar

Own: `src/components/marketplace/product/BuyBox.tsx` (new), `src/components/marketplace/product/QuantityStepper.tsx` (new), `src/components/marketplace/product/PriceEstimate.tsx` (new).
Price block: big price (text-3xl font-extrabold tabular-nums ink-900) + "/ unit", sub-line "Final price from the seller after quantity and delivery" (service copy variant); `0` → "Ask for price". Fact strip (3 cells, hairline dividers): "In stock" / "Ships in 1 day" / "Min. order 1 Pcs" (service variants). Quantity stepper: −/+ 44px buttons + numeric input (inputmode numeric), min = moq||1, step 1 (step = moq for bulk units when moq>1? keep step 1), holding a button repeats (accelerating) — number changes animate with a 160ms vertical roll (old up/out, new up/in, opacity+translateY 6px; instant for keyboard input). Estimate: `price>0` → "Estimated ৳X for n {unit}" with tween (DOM write, no per-frame re-render; reuse `src/components/properties/animated-number.tsx` if suitable) + use `priceTiers` when present. Actions: primary `AddToQuoteButton variant="full"` (flyFrom = gallery image element `#product-hero-image` if present), secondary "Ask for price now" → `quoteHref&qty=n&unit=` (Task 2 reads it), tertiary Call / WhatsApp icon buttons when available. Phone: renders `MobileActionBar` with compact qty (− n +) + primary button; the bar appears after the in-page buy box scrolls out of view (IntersectionObserver; slide up translateY(100%)→0 320ms `--ease-drawer`; hidden again when buy box visible) — never covers the in-page buttons. Haptics on add.

## Task 9: Gallery

Own: `src/components/marketplace/product-gallery.tsx`, `src/components/marketplace/SwipeGallery.tsx`, `src/components/marketplace/MediaLightbox.tsx` (light touch only).
Phone: edge-to-edge square stage (negative container margin), rounded none, counter pill + dots; first image gets `id="product-hero-image"` wrapper for the add-to-quote flight; keep `transitionName` morph on the first slide and `priority`. Desktop: main stage 1:1 with `object-contain` on white + vertical thumbnail column left (keep the sliding layoutId ring), main image change crossfade 200ms ease-out with a 2px blur mask; hover-zoom (fine pointer only) following cursor via transform-origin, scale 1.6, 200ms; click opens lightbox (existing). Keep video slides, keyboard arrows (instant), swipe behaviour, reduced motion.

## Task 10: Product details, rails, recently viewed

Own: `src/components/marketplace/product/{ProductDetails,ProductRail,RecentlyViewedRail}.tsx` (new), `src/lib/recent-products.ts` (new), `src/hooks/use-recent-products.ts` (new), `src/components/marketplace/product/RecentProductRecorder.tsx` (new), `src/lib/constants.ts` (add `LS_RECENT_PRODUCTS` only).
ProductDetails (server): sections with plain headings (no eyebrow, no accordion for the first two): "About this product" (shortDescription bold lead + description with line breaks; collapse long text >600 chars behind "Read more" with height animation 220ms), "Product details" — a clean two-column definition table built from whatever exists: Brand, Unit, Minimum order, Lead time, SKU, Warranty, Origin, Packaging, + `specs[]` rows; hairline row dividers, label ink-500 / value ink-900, then Bulk pricing table if `priceTiers`, Documents if any, Options if `variants` (each with Ask for price link). "Sold by" seller panel: logo/initials, name + verified, location, years in business, reply time, delivery days, service areas chips, "Visit seller" link. Rails: `ProductRail` = horizontal scroll-snap row of `MarketplaceProductCard` (fixed width 160px phone / 220px desktop), title + "See all" link, desktop prev/next buttons that scroll by one viewport (smooth unless reduced motion), edge fade masks; renders null when empty. Titles: "Similar products", "More from {seller}", "Recently viewed" (pass `morph={false}` on recently viewed and on any card whose slug appears in an earlier rail). Recently viewed: store snapshot on view, max 12, exclude current, render only when ≥2.
