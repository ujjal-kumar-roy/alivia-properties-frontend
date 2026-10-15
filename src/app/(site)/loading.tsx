import { BrandLoader } from "@/components/common/brand-loader"
import { ApartmentDetailLoading, PropertyDetailLoading } from "@/components/common/detail-loading"
import { MorphLoading } from "@/components/common/morph-placeholder"

/**
 * The site's catch-all route fallback. Next can commit it first on the way to
 * a detail page (from a page outside this section's segment), so right after a
 * card was tapped it shows that detail page's skeleton instead.
 */
export default function Loading() {
  return (
    <MorphLoading
      detail={{ apartment: <ApartmentDetailLoading />, property: <PropertyDetailLoading /> }}
    >
      <BrandLoader />
    </MorphLoading>
  )
}
