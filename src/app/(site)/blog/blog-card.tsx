import Link from "next/link"
import Image from "next/image"
import { CalendarDays, Clock, UserRound } from "lucide-react"

import { CardFact } from "@/components/common/card-fact"
import { ROUTES } from "@/config/routes.config"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import type { BlogPost } from "@/services/blog.service"
import { formatDate } from "@/utils/format-date"

export const FALLBACK_BLOG_IMAGE =
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"

/**
 * Article card. Phones get the compact row used by every listing on the site
 * (square thumbnail left, title over two lines, date and read time as facts,
 * about 116px tall); from `sm` it becomes a vertical card with the excerpt.
 */
export function BlogCard({ post }: { post: BlogPost }) {
  const readMinutes = post.readTime ?? post.readMinutes ?? null
  const author = typeof post.author === "string" ? post.author : post.author.name
  const href = ROUTES.BLOG_POST(post.slug)

  return (
    <article
      data-card
      className="group relative min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-(--shadow-card) transition-[translate,scale,box-shadow] duration-200 active:scale-[0.99] sm:rounded-3xl sm:hover:-translate-y-1 sm:hover:shadow-(--shadow-elevated) motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
    >
      <Link
        href={href}
        className="flex gap-2.5 rounded-[inherit] p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-400 sm:block sm:p-0"
      >
        {/* Media: square thumbnail on phones, 16:10 image from sm. */}
        <div className="relative aspect-square w-25 shrink-0 self-start overflow-hidden rounded-xl bg-ink-100 sm:aspect-16/10 sm:w-full sm:self-auto sm:rounded-none">
          <Image
            src={post.coverImage || FALLBACK_BLOG_IMAGE}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100px"
            placeholder="blur"
            blurDataURL={CARD_BLUR_DATA_URL}
            className="object-cover transition-transform duration-500 motion-reduce:transition-none sm:group-hover:scale-105 motion-reduce:sm:group-hover:scale-100"
          />
          <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-full bg-brand-700 px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider text-white sm:left-3 sm:top-3 sm:max-w-[calc(100%-1.5rem)] sm:px-2.5 sm:py-1">
            {post.category}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col sm:p-4">
          <h2 className="line-clamp-2 font-heading text-[0.95rem] font-semibold leading-tight text-ink-900 transition-colors group-hover:text-brand-700 sm:text-base">
            {post.title}
          </h2>
          <p className="mt-1.5 hidden line-clamp-2 text-[0.8125rem] leading-snug text-ink-600 sm:block">
            {post.excerpt}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs sm:mt-3 sm:gap-x-3">
            <li>
              <CardFact icon={CalendarDays}>{formatDate(post.publishedAt)}</CardFact>
            </li>
            {readMinutes != null && (
              <li>
                <CardFact icon={Clock}>{readMinutes} min read</CardFact>
              </li>
            )}
            <li className="min-w-0 max-w-full">
              <CardFact icon={UserRound} className="max-w-full">
                <span className="truncate">{author}</span>
              </CardFact>
            </li>
          </ul>
        </div>
      </Link>
    </article>
  )
}
