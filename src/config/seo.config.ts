import { siteConfig } from "@/config/site.config"
import type { Metadata } from "next"

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "real estate Bangladesh",
    "property for sale Dhaka",
    "property for rent Dhaka",
    "apartment Bashundhara",
    "Gulshan apartment",
    "Alivia Properties",
    "buy property Bangladesh",
    "real estate developer Bangladesh",
    "flats for sale Dhaka",
  ],
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    shortcut: "/icon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_BD",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: { index: true, follow: true },
}

// Structured data helpers
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.logo}`,
    description: siteConfig.description,
    address: {
      "@type": "PostalAddress",
      addressCountry: "BD",
      addressLocality: "Rupganj",
      addressRegion: "Narayanganj",
      streetAddress: siteConfig.contact.address,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.contact.phoneRaw,
      contactType: "customer service",
    },
    sameAs: Object.values(siteConfig.social),
  }
}

export function propertyListingSchema(property: {
  name: string
  description: string
  url: string
  price: number
  image?: string
  address: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.name,
    description: property.description,
    url: property.url,
    image: property.image,
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "BDT",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressCountry: "BD",
    },
  }
}
