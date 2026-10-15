# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Bangladeshi buyers, mostly on phones. Two audiences use the same marketplace pages roughly equally (confirmed 2026-10-15):

- **Homeowners and apartment buyers** furnishing or finishing their own home. They browse by look and price and want a handful of items.
- **Contractors and builders** sourcing in bulk. Minimum order quantity, lead time, unit pricing and the seller behind the product matter most; they compare many items quickly.

Property seekers and investors use the rest of the site (Alivia apartments, marketplace property listings, consultations).

## Product Purpose

Alivia Properties is a Bangladesh real-estate platform with three lanes: Alivia's own apartment projects, a property marketplace (sale/rent listings from owners and agents), and a construction and home-goods marketplace (materials, equipment, furniture, electronics, services from verified suppliers). Success on the marketplace is a buyer sending a quote request that reaches the right seller.

## Positioning

One place to find a home and everything needed to build, finish and furnish it, with verified Bangladeshi sellers and quote-based pricing that reflects quantity and delivery location.

## Operating Context

- Purchasing is **quote request only** (confirmed): buyers add products to a quote request and the seller responds with a final price. Listed prices are indicative ("Quoted after quantity and delivery location"). There is no cart checkout or online payment.
- Prices are in BDT (৳), with crore/lakh conventions for large amounts.
- Catalogue data comes from the live API (categories → departments, suppliers, products with images, unit, MOQ, lead time, brand, stock, badges, optional specs/pricing tiers/documents). Many products have sparse data (no specs, short descriptions), so layouts must hold up with thin content.
- Most traffic is mobile web; the site should feel like a native app (gestures, tap feedback, page transitions).

## Capabilities and Constraints

- Next.js 16 App Router, React 19, Tailwind v4, shadcn (base-nova), `motion`, `three`. pnpm only.
- Marketplace product pages may show: similar products from the same category, more products from the same seller, a quantity selector with an indicative price estimate, and recently viewed products stored on the visitor's device only (confirmed 2026-10-15).
- Quote request is the single primary action on product pages. The backend quote API takes one product per request (`POST /marketplace/quotes`) or one message to several suppliers (`POST /marketplace/quotes/batch`); there is no multi-product quote endpoint. A client-side quote list (2026-10-15 revamp) collects products and sends one request per product from a single form.
- The public product list API supports only `page`, `limit` (max 100), `search` (name contains), `sort` (one `field:dir`), `category`, `supplierId` and `kind`. No price, brand or stock filters server-side.
- Real catalogue data is thin: ratings, reviews, variants, specs, price tiers, documents and highlights are empty in production; `badge` is "Best Seller" on ~99% of products, so it carries no information; some prices are 0 (quote on request).
- No reviews or ratings data should be invented for marketplace products.

## Brand Commitments

- Name: Alivia Properties.
- Emerald brand color with warm gold accent; light mode only on customer pages (documented in `AGENTS.md` and `docs/superpowers/specs/2026-07-07-project-first-ecommerce-design.md`: "Do not switch palettes").
- Plain, low-jargon buyer copy ("Ask for a price", "Sellers") per `docs/superpowers/specs/2026-07-08-marketplace-plain-language-simplicity-design.md`.

## Evidence on Hand

- Real supplier, product and category data in the production API; product photography supplied by sellers.
- No customer testimonials, ratings or sales volumes for marketplace products; do not fabricate them. "Best seller" style badges come from seller-set data only.

## Product Principles

1. The quote request is the conversion: every marketplace screen should make asking for a price obvious and cheap.
2. Serve both the browser and the bulk buyer: scannable price, MOQ, lead time and seller on every product, without burying the photo.
3. Mobile first, app-like: thumb-reachable actions, gestures, motion that explains what changed.
4. Honest data: show what the seller provided, degrade gracefully when it is missing, never invent claims.
5. Plain language a first-time buyer understands.
