import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    // React <ViewTransition> on route navigations: app-like page transitions on
    // customer-facing routes (see src/components/layout/page-transition.tsx).
    viewTransition: true,
  },
  images: {
    // Next.js 16 blocks the image optimizer from fetching local IPs (localhost →
    // 127.0.0.1) by default. The MinIO object store runs on localhost:9000 in dev,
    // so allow it here. DEV ONLY — in production MinIO/S3 has a public host, so do
    // not ship this flag to prod (remove it or gate behind NODE_ENV).
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      // MinIO object store (admin/seller uploads) in local dev. Backend images
      // are normally rendered with `unoptimized`, but allowing the host here is
      // a safety net so a forgotten `unoptimized` doesn't crash the page.
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      // Production MinIO public host — uploaded images are served from the API
      // domain (nginx proxies /<bucket>/* → MinIO). Required for the Next image
      // optimizer to fetch them; without it /_next/image returns 400.
      {
        protocol: "https",
        hostname: "api-prd.aliviaproperties.com",
      },
    ],
  },
  async redirects() {
    // Public "projects" section was rebranded to "apartments". Keep old links
    // (bookmarks, search index, inbound) working.
    return [
      { source: "/projects", destination: "/apartments", permanent: true },
      { source: "/projects/:slug", destination: "/apartments/:slug", permanent: true },
    ]
  },
}

export default nextConfig
