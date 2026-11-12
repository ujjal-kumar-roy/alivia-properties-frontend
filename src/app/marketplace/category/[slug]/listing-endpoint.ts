import type { NextRequest } from "next/server";

import {
  SEARCH_MAX_LENGTH,
  sortOptionsFor,
  type ListingView,
} from "@/components/marketplace/category-filters";
import type { Paginated } from "@/services/http-client";

/**
 * The shared half of the category listing's next-page endpoints
 * (./products/route.ts and ./suppliers/route.ts), which the infinite scroll
 * calls through src/services/category-results.service.ts. They run on the
 * server, so the browser never calls the API directly (no CORS) and the
 * request matches the one the page made for page 1.
 *
 * They are plain GETs on purpose. The listing used to load its next pages
 * through Server Functions, which React sends as `POST` with
 * `Content-Type: text/plain`. The nginx in front of production answers 403 to
 * every POST that is not JSON, a form or multipart, so on the live site the
 * next page never loaded (dev has no such proxy, so it worked there). A GET is
 * what a read should be anyway: Next documents Server Functions as mutations,
 * queued one at a time.
 *
 * These are public endpoints, so every field is checked here against what the
 * page itself can send: the listing's sort whitelist, the two seller types,
 * the page's search cap. Values are passed through, never "corrected": page 2
 * must use exactly the sort, filter and search page 1 used, or the list would
 * skip or repeat items. Anything else is answered 400.
 */

/** Must match the page's first-page size, or pages would overlap or skip. */
const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;
const MAX_PAGE = 10_000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export type ListingQuery = {
  category: string;
  page: number;
  limit: number;
  sort?: string;
  kind?: "SUPPLIER" | "SERVICE";
  search?: string;
};

type Checked = { ok: true; query: ListingQuery } | { ok: false; message: string };

/** Plain digits only: "2", never "2.5", "1e1", "0x2" or " 2". */
function wholeNumber(raw: string | null): number | undefined {
  return raw !== null && /^\d+$/.test(raw) ? Number(raw) : undefined;
}

function parseListingQuery(
  category: string,
  params: URLSearchParams,
  view: ListingView,
): Checked {
  const refuse = (message: string): Checked => ({ ok: false, message });

  if (category.length > 120 || !SLUG_PATTERN.test(category)) {
    return refuse("Invalid category");
  }

  const page = wholeNumber(params.get("page"));
  if (page === undefined || page < 1 || page > MAX_PAGE) {
    return refuse("Invalid page");
  }

  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? DEFAULT_PAGE_SIZE : wholeNumber(rawLimit);
  if (limit === undefined || limit < 1 || limit > MAX_PAGE_SIZE) {
    return refuse("Invalid limit");
  }

  // Only the API orders this view's sort menu offers (what sortToApi() returns),
  // so a public endpoint never asks the backend to order by an arbitrary field.
  const sort = params.get("sort") ?? undefined;
  if (
    sort !== undefined &&
    !sortOptionsFor(view).some((option) => option.api === sort)
  ) {
    return refuse("Invalid sort");
  }

  const kind = params.get("kind") ?? undefined;
  if (kind !== undefined && kind !== "SUPPLIER" && kind !== "SERVICE") {
    return refuse("Invalid kind");
  }

  const search = params.get("search") ?? undefined;
  if (search !== undefined && search.length > SEARCH_MAX_LENGTH) {
    return refuse("Invalid search");
  }

  return {
    ok: true,
    query: { category, page, limit, sort, kind, search: search || undefined },
  };
}

export type ListingContext = { params: Promise<{ slug: string }> };

/** Checks the request, then answers with `load`'s page as JSON (`{ data, meta }`, like the API). */
export async function respondWithListing<T>(
  request: NextRequest,
  { params }: ListingContext,
  view: ListingView,
  load: (query: ListingQuery) => Promise<Paginated<T>>,
): Promise<Response> {
  const { slug } = await params;
  const checked = parseListingQuery(slug, request.nextUrl.searchParams, view);
  // Never cached: the next page has to continue the list page 1 came from.
  const headers = { "Cache-Control": "no-store" };

  if (!checked.ok) {
    return Response.json(
      {
        statusCode: 400,
        message: checked.message,
        error: "Bad Request",
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      },
      { status: 400, headers },
    );
  }
  return Response.json(await load(checked.query), { headers });
}
