export const dynamic = "force-dynamic"

import { after } from "next/server"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, CalendarDays, ChevronRight, Clock } from "lucide-react"
import { BlogCard, FALLBACK_BLOG_IMAGE } from "@/app/(site)/blog/blog-card"
import { CardFact } from "@/components/common/card-fact"
import { CARD_BLUR_DATA_URL } from "@/lib/image-placeholder"
import { blogService, recordArticleView } from "@/services/blog.service"
import { ROUTES } from "@/config/routes.config"
import { formatDate } from "@/utils/format-date"

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

/**
 * Thin reading-progress bar, driven by the page scroll on the compositor
 * (CSS scroll-driven animation, no scroll listener). Browsers without support
 * and visitors who prefer reduced motion simply never see it: it is hidden by
 * default and only switched on inside the @supports + motion guard.
 */
const READ_PROGRESS_CSS = `
@keyframes read-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: scroll()) {
    .read-progress { display: block; animation: read-progress linear both; animation-timeline: scroll(root); }
  }
}
`

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await blogService.bySlug(slug).catch(() => null)
  if (!post) notFound()

  // Defer the view-count write until after the article HTML is sent, so reading
  // the post is never blocked by the analytics update. Errors are ignored.
  after(() => {
    void recordArticleView(slug).catch(() => {})
  })

  const relatedRes = await blogService.list({ category: post.category, limit: 4 }).catch(() => ({
    data: [],
    meta: { page: 1, limit: 4, total: 0, totalPages: 0 },
  }))
  const related = relatedRes.data.filter((item) => item.id !== post.id).slice(0, 3)

  const authorObj =
    typeof post.author === "string"
      ? { name: post.author, avatar: post.authorAvatar ?? null, title: "" }
      : post.author
  const paragraphs = (post.content ?? "").split("\n\n").filter(Boolean)
  const readMinutes = post.readTime ?? post.readMinutes ?? null

  return (
    <div className="py-4 sm:py-8 lg:py-12">
      <style>{READ_PROGRESS_CSS}</style>
      <div
        aria-hidden="true"
        className="read-progress fixed inset-x-0 top-0 z-60 hidden h-[3px] origin-left bg-linear-to-r from-brand-500 to-gold-400"
      />

      <div className="container-page max-w-4xl">
        {/* Phones: one 36px chip back to the list. From sm: the full breadcrumb. */}
        <div className="mb-3 flex items-center gap-2 sm:hidden">
          <Link href={ROUTES.BLOG} className="glass-chip gap-1 pl-2.5">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Blog
          </Link>
          <span className="truncate rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            {post.category}
          </span>
        </div>
        <nav aria-label="Breadcrumb" className="mb-6 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Link href={ROUTES.HOME} className="-my-1.5 inline-block py-1.5 hover:text-foreground">Home</Link>
          <ChevronRight aria-hidden="true" className="h-3 w-3" />
          <Link href={ROUTES.BLOG} className="-my-1.5 inline-block py-1.5 hover:text-foreground">Blog</Link>
          <ChevronRight aria-hidden="true" className="h-3 w-3" />
          <span className="line-clamp-1 font-medium text-foreground">{post.title}</span>
        </nav>

        <div className="enter-cascade">
          <span className="mb-4 hidden w-fit rounded-full bg-brand-100 px-3 py-0.5 text-xs font-semibold text-brand-700 sm:block">
            {post.category}
          </span>

          <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight text-ink-900 text-balance sm:text-4xl">
            {post.title}
          </h1>

          <div className="mt-2.5 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-ink-600 sm:mt-4 sm:mb-8">
            <div className="flex items-center gap-2">
              {authorObj.avatar && (
                <Image
                  src={authorObj.avatar}
                  alt=""
                  width={28}
                  height={28}
                  unoptimized
                  className="size-7 rounded-full object-cover"
                />
              )}
              <p className="text-[0.8125rem] font-semibold text-ink-900">
                {authorObj.name}
                {"title" in authorObj && authorObj.title ? (
                  <span className="hidden font-normal text-ink-600 sm:inline"> · {authorObj.title}</span>
                ) : null}
              </p>
            </div>
            <CardFact icon={CalendarDays}>{formatDate(post.publishedAt, "d MMMM yyyy")}</CardFact>
            {readMinutes != null && <CardFact icon={Clock}>{readMinutes} min read</CardFact>}
          </div>
        </div>

        <div className="relative mb-5 aspect-video overflow-hidden rounded-2xl bg-ink-100 sm:mb-8 md:aspect-auto md:h-96">
          <Image
            src={post.coverImage || FALLBACK_BLOG_IMAGE}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            placeholder="blur"
            blurDataURL={CARD_BLUR_DATA_URL}
            className="object-cover"
          />
        </div>

        {/* Reading column: 16px body and a measure of about 68 characters. */}
        <article className="mx-auto max-w-[68ch] space-y-4 text-base leading-[1.75] text-ink-800">
          {paragraphs.map((para, index) => {
            if (para.startsWith("## ") || para.startsWith("# ")) {
              const text = para.replace(/^#{1,2} /, "")
              return (
                <h2 key={index} className="mt-8 mb-1 font-heading text-xl font-bold leading-snug text-ink-900 sm:text-2xl">
                  {text}
                </h2>
              )
            }
            if (para.startsWith("### ")) {
              return (
                <h3 key={index} className="mt-6 mb-1 text-lg font-bold text-ink-900">
                  {para.slice(4)}
                </h3>
              )
            }
            if (para.startsWith("- ")) {
              const items = para.split("\n").filter((line) => line.startsWith("- "))
              return (
                <ul key={index} className="list-disc space-y-1.5 pl-5 marker:text-brand-400">
                  {items.map((item, itemIndex) => <li key={itemIndex}>{item.slice(2)}</li>)}
                </ul>
              )
            }
            return <p key={index}>{para}</p>
          })}
        </article>

        {related.length > 0 && (
          <div className="reveal mt-10 border-t border-border pt-6 sm:mt-16 sm:pt-8">
            <h2 className="mb-3 font-heading text-lg font-bold text-ink-900 sm:mb-6 sm:text-2xl">Related Articles</h2>
            <ul className="reveal-stagger grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-5">
              {related.map((item) => (
                <li key={item.id} className="min-w-0">
                  <BlogCard post={item} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
