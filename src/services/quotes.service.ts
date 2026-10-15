import { httpClient, type Paginated } from "./http-client"
import type {
  CreateQuoteBatchInput,
  CreateQuoteInput,
  QuoteBatchResult,
  QuoteQueryParams,
  QuoteRequest,
} from "@/types/quote.types"

const BASE = "/marketplace/quotes"

export const quotesService = {
  /**
   * Public — submit a quote request from the marketplace. `signal` (optional)
   * lets a caller cancel or time out the request (the quote list does).
   */
  create(
    input: CreateQuoteInput,
    token?: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<QuoteRequest> {
    return httpClient.post<QuoteRequest>(BASE, input, { token, signal: options.signal })
  },

  /** Public — submit one quote to multiple suppliers (the wizard). */
  createBatch(input: CreateQuoteBatchInput, token?: string): Promise<QuoteBatchResult> {
    return httpClient.post<QuoteBatchResult>(`${BASE}/batch`, input, { token })
  },

  /** Admin / Supplier — list quote requests with filtering */
  list(params: QuoteQueryParams = {}, token?: string): Promise<Paginated<QuoteRequest>> {
    return httpClient.paginated<QuoteRequest>(BASE, {
      query: params as Record<string, string | number | boolean | undefined>,
      token,
    })
  },

  detail(id: string, token?: string): Promise<QuoteRequest> {
    return httpClient.get<QuoteRequest>(`${BASE}/${id}`, { token })
  },

  update(
    id: string,
    body: {
      status?: QuoteRequest["status"]
      assignedTo?: string
      reply?: string
      note?: string
      finalQuotedPrice?: number
    },
    token?: string,
  ): Promise<QuoteRequest> {
    return httpClient.patch<QuoteRequest>(`${BASE}/${id}`, body, { token })
  },
}
