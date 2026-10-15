import { z } from "zod"

export const quoteSchema = z.object({
  supplierId: z.string().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  categorySlug: z.string().optional(),

  name: z
    .string("Name is required")
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name is too long"),

  email: z.email("Enter a valid email address"),

  phone: z
    .string("Phone is required")
    .trim()
    .min(6, "Enter a valid phone number")
    .max(32, "Phone is too long"),

  company: z.string().max(160, "Company name is too long").optional().or(z.literal("")),
  city: z.string().max(120, "City name is too long").optional().or(z.literal("")),
  deliveryLocation: z
    .string("Delivery location is required")
    .trim()
    .min(3, "Enter delivery location")
    .max(240, "Delivery location is too long"),

  quantity: z
    .union([z.number(), z.string()])
    .optional()
    .transform(v => (v === "" || v === undefined || v === null ? undefined : Number(v)))
    .refine(v => v === undefined || (!Number.isNaN(v) && v >= 0), "Enter a non-negative quantity"),

  unit: z.string().max(32, "Unit is too long").optional().or(z.literal("")),

  deliveryDate: z.string().optional().or(z.literal("")),

  message: z
    .string("Tell us a bit about your requirement")
    .trim()
    .min(8, "Message must be at least 8 characters")
    .max(2000, "Message is too long"),
})

/**
 * The quote list (several products, one request per product): each item's
 * name and quantity already say what is needed, so the buyer's note is
 * optional. Capped below 2000 because it is appended to a per-item line.
 * Same input/output shape as quoteSchema (message stays a string, "" allowed).
 */
export const quoteItemsSchema = quoteSchema.extend({
  message: z.string().trim().max(1500, "Note is too long"),
})

export type QuoteFormValues = z.input<typeof quoteSchema>
export type QuoteSubmitValues = z.output<typeof quoteSchema>
