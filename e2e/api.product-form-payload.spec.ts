import { expect, test } from "@playwright/test"
import {
  emptyProductForm,
  productFormSchema,
  productFormToPayload,
  type ProductFormInput,
} from "@/schemas/marketplace-product.schema"

/*
 * The request body the product editor sends to POST/PATCH /marketplace/{admin,seller}/products, with no
 * browser and no API call. `externalVideoUrl` is optional, so it stays off the wire unless the save changes
 * it: an API that predates the field (production did, and answered "property externalVideoUrl should not
 * exist" to every save) must still accept a product whose video link nobody touched.
 */

const LINK = "https://youtu.be/dQw4w9WgXcQ"

/** What the editor hands the mapper: the real schema's output, so its defaults and trimming apply. */
function formValues(overrides: Partial<ProductFormInput> = {}) {
  return productFormSchema.parse({
    ...emptyProductForm("supplier-1", "vacuum-cleaners", "Pcs"),
    name: "Oraimo CordForce Flex",
    image: "/uploads/oraimo.webp",
    ...overrides,
  })
}

/** The body as the API receives it: JSON drops `undefined`. */
const wire = (payload: object) => JSON.parse(JSON.stringify(payload)) as Record<string, unknown>

test.describe("product form request body: externalVideoUrl", () => {
  test("a new product without a video link does not send the field", () => {
    expect(wire(productFormToPayload(formValues()))).not.toHaveProperty("externalVideoUrl")
  })

  test("a new product with a video link sends it, trimmed", () => {
    const body = wire(productFormToPayload(formValues({ externalVideoUrl: `  ${LINK} ` })))
    expect(body.externalVideoUrl).toBe(LINK)
  })

  test("an edit that leaves the link alone does not send it, whether it has one or not", () => {
    expect(wire(productFormToPayload(formValues(), { externalVideoUrl: null }))).not.toHaveProperty("externalVideoUrl")
    expect(wire(productFormToPayload(formValues(), { externalVideoUrl: undefined }))).not.toHaveProperty(
      "externalVideoUrl",
    )
    expect(
      wire(productFormToPayload(formValues({ externalVideoUrl: LINK }), { externalVideoUrl: LINK })),
    ).not.toHaveProperty("externalVideoUrl")
  })

  test("an edit that changes the link sends the new one", () => {
    const next = "https://vimeo.com/76979871"
    expect(wire(productFormToPayload(formValues({ externalVideoUrl: next }), { externalVideoUrl: LINK })).externalVideoUrl).toBe(
      next,
    )
    expect(wire(productFormToPayload(formValues({ externalVideoUrl: LINK }), { externalVideoUrl: null })).externalVideoUrl).toBe(
      LINK,
    )
  })

  test("clearing a saved link sends an empty string, the API's way to remove it", () => {
    const body = wire(productFormToPayload(formValues({ externalVideoUrl: "" }), { externalVideoUrl: LINK }))
    expect(body.externalVideoUrl).toBe("")
  })
})
