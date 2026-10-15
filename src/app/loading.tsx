import { BrandLoader } from "@/components/common/brand-loader"
import {
  ApartmentDetailLoading,
  PropertyDetailLoading,
  SiteHeaderSpace,
} from "@/components/common/detail-loading"
import { MorphLoading } from "@/components/common/morph-placeholder"

/**
 * The root route fallback. Leaving `/` (or the marketplace, or a dashboard)
 * for a site page, Next can commit this one first, outside the site layout, so
 * right after a card was tapped it shows the detail skeleton below a space the
 * size of the site header, where the layout will put it.
 */
export default function Loading() {
  return (
    <MorphLoading
      detail={{
        apartment: (
          <>
            <SiteHeaderSpace />
            <ApartmentDetailLoading />
          </>
        ),
        property: (
          <>
            <SiteHeaderSpace />
            <PropertyDetailLoading />
          </>
        ),
      }}
    >
      <BrandLoader label="Loading the marketplace" />
    </MorphLoading>
  )
}
