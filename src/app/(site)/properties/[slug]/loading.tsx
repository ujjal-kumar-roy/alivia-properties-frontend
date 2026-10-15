import { PropertyDetailLoading } from "@/components/common/detail-loading"
import { MorphLoading } from "@/components/common/morph-placeholder"

export default function Loading() {
  return (
    <MorphLoading>
      <PropertyDetailLoading />
    </MorphLoading>
  )
}
