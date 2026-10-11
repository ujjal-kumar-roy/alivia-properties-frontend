export type ProjectStatus = "ongoing" | "upcoming" | "completed"

export type ProjectUnit = {
  id?: string
  type?: string
  name?: string
  bedrooms?: number
  bathrooms?: number
  size?: number
  sizeUnit?: string
  price?: number
  priceMax?: number
  priceFrom?: number
  priceTo?: number
  available?: number
  total?: number
}

export type NearbyLandmark = {
  name: string
  group: string
}

export type ProjectView = {
  name: string
  pricePremium?: number
}

export type Project = {
  id: string
  slug: string
  name: string
  tagline?: string
  description?: string
  status: ProjectStatus
  location: string
  address?: string
  area?: string
  division?: string

  // images — backend may send as objects; service normalises to strings
  coverImageUrl?: string
  coverImage?: string          // alias for pages that use coverImage
  galleryImages: string[]

  // video — uploaded clips and/or an external link (YouTube/Vimeo/direct file)
  videos?: string[]
  videoUrl?: string
  /** Equirectangular 360° image URL for the in-app virtual tour. */
  panoramaUrl?: string

  handoverDate?: string
  landSize?: number
  landSizeUnit?: string
  totalFloors?: number
  totalUnits?: number
  availableUnits?: number
  soldUnits?: number
  priceFrom?: number
  priceTo?: number
  amenities?: string[]
  units?: ProjectUnit[]
  specifications?: Record<string, string | number>
  nearbyLandmarks?: NearbyLandmark[]
  views?: ProjectView[]
  developerName?: string
  viewCount?: number
  isFeatured?: boolean
  featured?: boolean            // alias for pages that use featured
  createdAt?: string
  updatedAt?: string
}
