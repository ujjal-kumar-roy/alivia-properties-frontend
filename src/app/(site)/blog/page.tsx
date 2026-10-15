export const dynamic = "force-dynamic"

import Link from "next/link"
import { Newspaper } from "lucide-react"
import { ROUTES } from "@/config/routes.config"
import { blogService } from "@/services/blog.service"
import { BlogCard } from "./blog-card"

interface BlogPageProps {
  searchParams: Promise<{ category?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category } = await searchParams
  const postsRes = await blogService.list({ category, limit: 24 }).catch(() => ({
    data: [],
    meta: { page: 1, limit: 24, total: 0, totalPages: 0 },
  }))
  const allPostsRes = await blogService.list({ limit: 50 }).catch(() => ({
    data: [],
    meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
  }))

  const posts = postsRes.data
  const categories = Array.from(new Set(allPostsRes.data.map((post) => post.category))).sort()

  return (
    <div className="py-4 sm:py-8 lg:py-12">
      <div className="container-page">
        <header className="enter-cascade mb-3 sm:mb-6">
          <p className="text-eyebrow mb-2 hidden sm:block">Our Blog</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
            Real Estate Insights
          </h1>
          <p className="mt-1.5 line-clamp-2 text-[0.9375rem] leading-snug text-ink-600 sm:line-clamp-none sm:text-base">
            Expert tips, market analysis, and buying guides for the Bangladesh property market.
          </p>
        </header>

        {/* One scrollable row of 36px chips; never wraps on phones. */}
        <nav
          aria-label="Article categories"
          className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:mb-6 sm:flex-wrap sm:px-0"
        >
          <Link href={ROUTES.BLOG} className="glass-chip" aria-current={!category ? "page" : undefined}>
            All
          </Link>
          {categories.map((item) => (
            <Link
              key={item}
              href={`${ROUTES.BLOG}?category=${encodeURIComponent(item)}`}
              className="glass-chip"
              aria-current={category === item ? "page" : undefined}
            >
              {item}
            </Link>
          ))}
        </nav>

        {posts.length > 0 ? (
          <ul className="reveal-stagger grid gap-2.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id} className="min-w-0">
                <BlogCard post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-8 text-center shadow-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Newspaper aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-3 font-heading text-lg font-semibold text-ink-900">
              {category ? "Nothing here yet" : "Articles are on the way"}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-snug text-ink-600">
              {category
                ? "No articles found for this category yet."
                : "We are writing new guides for buyers and sellers. Check back soon."}
            </p>
            {category && (
              <Link href={ROUTES.BLOG} className="btn-tactile btn-tactile--sm mt-4">
                See all articles
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
