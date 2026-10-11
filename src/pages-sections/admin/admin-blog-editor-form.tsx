"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Eye, ImagePlus, Loader2, Save, X } from "lucide-react"

import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { DetailBack } from "@/components/dashboard/detail"
import { FormSection } from "@/components/dashboard/form-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ROUTES } from "@/config/routes.config"
import { blogService, type BlogPost, type BlogPostInput } from "@/services/blog.service"
import { uploadsService } from "@/services/uploads.service"
import { ApiError } from "@/services/http-client"

type AdminBlogEditorFormProps = {
  post?: BlogPost
  token?: string
}

const MAX_IMAGE_MB = 5

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function toDateTimeLocal(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function AdminBlogEditorForm({ post, token }: AdminBlogEditorFormProps) {
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(post?.title ?? "")
  const [slug, setSlug] = useState(post?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug))
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "")
  const [content, setContent] = useState(post?.content ?? "")
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "")
  const [author, setAuthor] = useState(typeof post?.author === "string" ? post.author : post?.author?.name ?? "Alivia Editorial Team")
  const [authorAvatar, setAuthorAvatar] = useState(post?.authorAvatar ?? "")
  const [category, setCategory] = useState(post?.category ?? "")
  const [tags, setTags] = useState(post?.tags?.join(", ") ?? "")
  const [readMinutes, setReadMinutes] = useState(String(post?.readMinutes ?? post?.readTime ?? 5))
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false)
  const [publishedAt, setPublishedAt] = useState(toDateTimeLocal(post?.publishedAt))
  const [uploading, setUploading] = useState<"cover" | "avatar" | null>(null)
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)

  // The error sits in the publishing card; bring it into view from the sticky bar on phones.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [error])

  function updateTitle(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  function payload(nextPublished: boolean): BlogPostInput {
    return {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim(),
      content: content.trim(),
      coverImage: coverImage.trim() || null,
      author: author.trim(),
      authorAvatar: authorAvatar.trim() || null,
      category: category.trim(),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      readMinutes: Math.max(1, Number(readMinutes) || 5),
      isPublished: nextPublished,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
    }
  }

  async function save(nextPublished: boolean) {
    setSaving(nextPublished ? "publish" : "draft")
    setError(null)

    try {
      const body = payload(nextPublished)
      const saved = post
        ? await blogService.update(post.id, body, token)
        : await blogService.create(body, token)

      router.push(ROUTES.ADMIN_BLOG_EDIT(saved.id))
      router.refresh()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not save this article.",
      )
    } finally {
      setSaving(null)
    }
  }

  async function uploadImage(file: File, target: "cover" | "avatar") {
    if (!token) {
      setError("You must be signed in to upload images.")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.")
      return
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_IMAGE_MB} MB.`)
      return
    }

    setUploading(target)
    setError(null)

    try {
      const result = await uploadsService.uploadFile(
        file,
        target === "cover" ? "blog-image" : "avatar",
        token,
      )
      if (target === "cover") setCoverImage(result.publicUrl)
      else setAuthorAvatar(result.publicUrl)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 0
            ? err.message // network failure — already a clear, user-facing message
            : `Upload failed: ${err.message}`
          : err instanceof Error
            ? err.message
            : "Could not upload image.",
      )
    } finally {
      setUploading(null)
      if (target === "cover" && coverInputRef.current) coverInputRef.current.value = ""
      if (target === "avatar" && avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-3 sm:space-y-5">
      <DetailBack href={ROUTES.ADMIN_BLOG}>Back to blog</DetailBack>

      <div className="grid grid-cols-1 gap-3 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="surface-card space-y-4 p-4 sm:space-y-5 sm:p-5">
          <div>
            <Label htmlFor="blog-title">Title</Label>
            <Input
              id="blog-title"
              value={title}
              onChange={(event) => updateTitle(event.target.value)}
              placeholder="Dhaka property market outlook"
              className="mt-2 h-11"
            />
          </div>

          <div>
            <Label htmlFor="blog-slug">Slug</Label>
            <Input
              id="blog-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true)
                setSlug(slugify(event.target.value))
              }}
              placeholder="dhaka-property-market-outlook"
              className="mt-2 h-11"
            />
          </div>

          <div>
            <Label htmlFor="blog-excerpt">Excerpt</Label>
            <Textarea
              id="blog-excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              placeholder="Short summary for cards and SEO previews."
              className="mt-2 min-h-24"
            />
          </div>

          <div>
            <Label htmlFor="blog-content">Content</Label>
            <Textarea
              id="blog-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={"Write the article body. Use ## headings and - bullet lines if needed."}
              className="mt-2 min-h-72 font-mono text-sm leading-6 sm:min-h-[420px]"
            />
          </div>
        </section>

        <aside className="space-y-3 sm:space-y-5">
          <div className="surface-card space-y-4 p-4 sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Publishing
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Save privately as a draft or publish live to the public blog.
              </p>
            </div>

            <label className="flex min-h-11 items-center gap-2.5 rounded-xl border border-border bg-ink-50 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(event) => setIsPublished(event.target.checked)}
                className="size-6 accent-brand-600 lg:size-4"
              />
              Published
            </label>

            <div>
              <Label htmlFor="blog-published-at">Published at</Label>
              <Input
                id="blog-published-at"
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
                className="mt-2 h-11"
              />
            </div>

            {/* md and up: inline buttons. Phones: the floating bar at the bottom. */}
            <div className="hidden gap-2 md:grid">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={saving !== null}
                onClick={() => save(false)}
              >
                {saving === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save draft
              </Button>
              <Button
                type="button"
                className="rounded-full"
                disabled={saving !== null}
                onClick={() => save(true)}
              >
                {saving === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                Publish
              </Button>
            </div>

            {error ? (
              <p ref={errorRef} role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}
          </div>

          <FormSection
            id="section-details"
            title="Article details"
            hint="Category, author, cover image, tags"
            defaultOpen={false}
            className="space-y-4"
          >
            <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 md:block">
              Article details
            </p>

            <div>
              <Label htmlFor="blog-category">Category</Label>
              <Input
                id="blog-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Market Updates"
                className="mt-2 h-11"
              />
            </div>

            <div>
              <Label htmlFor="blog-author">Author</Label>
              <Input
                id="blog-author"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className="mt-2 h-11"
              />
            </div>

            <div>
              <Label htmlFor="blog-author-avatar">Author avatar URL</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="blog-author-avatar"
                  value={authorAvatar}
                  onChange={(event) => setAuthorAvatar(event.target.value)}
                  placeholder="https://..."
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full"
                  disabled={saving !== null || uploading !== null}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {uploading === "avatar" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                </Button>
                {authorAvatar ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-full text-red-600 hover:bg-red-50"
                    disabled={saving !== null || uploading !== null}
                    onClick={() => setAuthorAvatar("")}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadImage(file, "avatar")
                }}
              />
            </div>

            <div>
              <Label htmlFor="blog-cover">Cover image URL</Label>
              {coverImage ? (
                <div className="relative mt-2 h-36 w-full overflow-hidden rounded-2xl border border-border">
                  <Image
                    src={coverImage}
                    alt="Blog cover preview"
                    fill
                    unoptimized
                    sizes="(max-width: 1280px) 100vw, 340px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="mt-2 flex gap-2">
                <Input
                  id="blog-cover"
                  value={coverImage}
                  onChange={(event) => setCoverImage(event.target.value)}
                  placeholder="https://..."
                  className="h-11"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full"
                  disabled={saving !== null || uploading !== null}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {uploading === "cover" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                </Button>
                {coverImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-full text-red-600 hover:bg-red-50"
                    disabled={saving !== null || uploading !== null}
                    onClick={() => setCoverImage("")}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Uploads to MinIO bucket `blog-images`. Recommended cover: 1200x630px.
              </p>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void uploadImage(file, "cover")
                }}
              />
            </div>

            <div>
              <Label htmlFor="blog-tags">Tags</Label>
              <Input
                id="blog-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="dhaka, investment, rajuk"
                className="mt-2 h-11"
              />
            </div>

            <div>
              <Label htmlFor="blog-read-minutes">Read minutes</Label>
              <Input
                id="blog-read-minutes"
                type="number"
                min={1}
                value={readMinutes}
                onChange={(event) => setReadMinutes(event.target.value)}
                className="mt-2 h-11"
              />
            </div>
          </FormSection>
        </aside>
      </div>

      <MobileActionBar label="Article actions">
        <button
          type="button"
          className="btn-glass shrink-0"
          disabled={saving !== null}
          onClick={() => save(false)}
        >
          {saving === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save draft
        </button>
        <button
          type="button"
          className="btn-tactile btn-tactile--block flex-1"
          disabled={saving !== null}
          onClick={() => save(true)}
        >
          {saving === "publish" ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
          Publish
        </button>
      </MobileActionBar>
    </div>
  )
}
