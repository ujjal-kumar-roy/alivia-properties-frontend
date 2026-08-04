export const siteConfig = {
  name: "Alivia Properties",
  shortName: "Alivia",
  tagline: "Your Trusted Real Estate Partner in Bangladesh",
  description:
    "Alivia Properties is a premier real estate platform in Bangladesh — showcasing exclusive developer apartments and a trusted marketplace for buying, selling, and renting properties across the country.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  // Marketplace destination. Default = same-origin /marketplace.
  // Set NEXT_PUBLIC_MARKETPLACE_URL only AFTER the subdomain is configured
  // on Vercel: Project → Settings → Domains → add `market-place.<your-domain>`.
  marketplaceUrl: process.env.NEXT_PUBLIC_MARKETPLACE_URL || "/marketplace",
  logo: "/logo.svg",
  ogImage: "/og-image.jpg",

  contact: {
    phone: "+880 1334-957230",
    phoneRaw: "+8801334957230",
    email: "aliviajolshiri26@gmail.com",
    emailAlt: "jolshiriabashon@gmail.com",
    whatsApp: "+8801334957230",
    address:
      "House 007, Road 401, Sector 13, Jolshiri Abason, Rupganj, Narayanganj, Bangladesh",
    officeHours: "Saturday – Thursday: 9:00 AM – 6:00 PM",
    mapEmbedUrl: "",
  },

  social: {
    facebook: "https://facebook.com/aliviaproperties",
    instagram: "https://instagram.com/aliviaproperties",
    youtube: "https://youtube.com/@aliviaproperties",
    linkedin: "https://linkedin.com/company/aliviaproperties",
  },

  stats: {
    projectsCompleted: 12,
    happyFamilies: 1800,
    yearsExperience: 14,
    totalListings: 500,
  },

  founder: {
    name: "Md. Rafiqul Islam",
    title: "Founder & Managing Director",
    message:
      "At Alivia Properties, we believe that finding the right home is more than a transaction — it is a life milestone. Our commitment is to make that journey transparent, trustworthy, and truly rewarding for every family in Bangladesh.",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format",
  },
} as const
