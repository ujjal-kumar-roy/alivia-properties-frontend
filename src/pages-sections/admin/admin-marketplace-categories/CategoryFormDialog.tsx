"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { AlertCircle, ImagePlus, Layers, Loader2, Package, X } from "lucide-react"
import { useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ApiError } from "@/services/http-client"
import {
  marketplaceService,
  type CategoryAttributeInput,
  type CategoryVariantInput,
  type MarketplaceCategory,
} from "@/services/marketplace.service"
import { RfqConfigEditor } from "./RfqConfigEditor"
import {
  LEVEL_BY_MODE,
  MODE_LABEL,
  type DialogMode,
  type FormState,
  emptyForm,
  toFormState,
} from "./types"
import { uploadImage, uploadImageRef } from "./upload"

const MAX_FILE_MB = 8

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: DialogMode
  editing: MarketplaceCategory | null
  /** All taxonomy nodes — used to populate the parent dropdown by level. */
  categories: MarketplaceCategory[]
  /** Pre-selected parent slug when adding a child from a row. */
  defaultParent?: string
  onSaved: (cat: MarketplaceCategory) => void
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  mode,
  editing,
  categories,
  defaultParent = "",
  onSaved,
}: Props) {
  const { data: session } = useSession()
  const [form, setForm] = useState<FormState>(
    editing ? toFormState(editing) : emptyForm(mode, defaultParent),
  )
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Reset the form when the dialog target changes (adjust-state-during-render).
  const targetKey = `${mode}:${editing?.slug ?? `new:${defaultParent}`}`
  const [prevKey, setPrevKey] = useState(targetKey)
  if (targetKey !== prevKey) {
    setPrevKey(targetKey)
    setForm(editing ? toFormState(editing) : emptyForm(mode, defaultParent))
  }

  const isDepartment = mode === "department"
  const isCategory = mode === "category"
  const needsParent = mode !== "department"

  // Categories nest under a department.
  const parentOptions = categories.filter((c) => c.level === "DEPARTMENT")

  const previewUrl = isCategory ? (form.image?.url ?? form.iconUrl) : form.iconUrl

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setError(null)
  }

  function patch(partial: Partial<FormState>) {
    setForm((f) => ({ ...f, ...partial }))
    setError(null)
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!session?.accessToken) {
      setError("You must be logged in to upload images.")
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${MAX_FILE_MB} MB.`)
      return
    }
    setUploadingImage(true)
    setError(null)
    try {
      if (isCategory) {
        const image = await uploadImageRef(file, session.accessToken)
        patch({ image })
      } else {
        const url = await uploadImage(file, session.accessToken)
        patch({ iconUrl: url })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploadingImage(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function removeImage() {
    if (isCategory) patch({ image: null })
    else patch({ iconUrl: "" })
  }

  async function handleSave() {
    if (!form.name.trim()) return setError("Name is required")
    if (!form.slug.trim()) return setError("Slug is required")
    if (needsParent && !form.parentSlug.trim()) {
      return setError("Select a parent department")
    }
    if (!session?.accessToken) return setError("Not authenticated")

    setSaving(true)
    setError(null)
    try {
      // Quote config applies to categories (the leaf where buyers request quotes).
      const variants: CategoryVariantInput[] = isCategory
        ? form.variants
            .filter((v) => v.name.trim())
            .map((v, i) => ({
              id: v.id,
              name: v.name.trim(),
              unit: v.unit.trim() || undefined,
              order: i,
              isActive: v.isActive,
            }))
        : []
      const attributes: CategoryAttributeInput[] = isCategory
        ? form.attributes
            .filter((a) => a.label.trim())
            .map((a, i) => ({
              id: a.id,
              label: a.label.trim(),
              type: a.type,
              options:
                a.type === "SELECT"
                  ? a.options.split(",").map((o) => o.trim()).filter(Boolean)
                  : [],
              unit: a.unit.trim() || undefined,
              required: a.required,
              order: i,
            }))
        : []

      const parentSlug = isDepartment ? null : form.parentSlug.trim() || null
      const order = parseInt(form.order, 10) || 0

      const saved = editing
        ? await marketplaceService.adminUpdateCategory(
            editing.slug,
            {
              name: form.name.trim(),
              level: LEVEL_BY_MODE[mode],
              description: form.description.trim() || null,
              iconUrl: form.iconUrl.trim() || null,
              image: isCategory ? form.image : null,
              parentSlug,
              order,
              isActive: form.isActive,
              variants,
              attributes,
            },
            session.accessToken,
          )
        : await marketplaceService.adminCreateCategory(
            {
              slug: form.slug.trim(),
              name: form.name.trim(),
              level: LEVEL_BY_MODE[mode],
              description: form.description.trim() || undefined,
              iconUrl: form.iconUrl.trim() || undefined,
              image: isCategory ? form.image : undefined,
              parentSlug: parentSlug ?? undefined,
              order,
              isActive: form.isActive,
              variants,
              attributes,
            },
            session.accessToken,
          )
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const badgeIcon = isDepartment ? <Layers className="size-3" /> : <Package className="size-3" />
  const title = `${editing ? "Edit" : "New"} ${MODE_LABEL[mode].toLowerCase()}`

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving && !uploadingImage) onOpenChange(v) }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                isDepartment && "bg-brand-100 text-brand-700",
                isCategory && "bg-ink-100 text-ink-700",
              )}
            >
              {badgeIcon}
              {MODE_LABEL[mode]}
            </span>
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isDepartment && "A department is the top level (e.g. \"Raw Materials\")."}
            {isCategory && "A category sits inside a department and is what buyers browse to reach suppliers (e.g. \"Tiles\")."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          {/* Image upload */}
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-ink-50">
              {previewUrl ? (
                <Image src={previewUrl} alt="Preview" fill sizes="80px" className="object-cover" unoptimized />
              ) : (
                <div className="flex size-full items-center justify-center text-ink-400">
                  <ImagePlus className="size-7" />
                </div>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <Loader2 className="size-5 animate-spin text-brand-600" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <p className="text-sm font-medium text-ink-800">
                {isCategory ? "Category image" : `${MODE_LABEL[mode]} icon (optional)`}
              </p>
              <p className="text-xs text-ink-500">
                {isCategory
                  ? "The tile shown in browse and the quote wizard. Recommended: 800×600px."
                  : "Recommended: 1200×400px."}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button" size="sm" variant="outline"
                  disabled={uploadingImage || saving}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full text-xs"
                >
                  {uploadingImage ? <Loader2 className="size-3 animate-spin" /> : <ImagePlus className="size-3" />}
                  {uploadingImage ? "Uploading…" : "Upload to MinIO"}
                </Button>
                {previewUrl && (
                  <Button
                    type="button" size="sm" variant="ghost" disabled={saving}
                    onClick={removeImage}
                    className="rounded-full text-xs text-destructive hover:bg-destructive/10"
                  >
                    <X className="size-3" /> Remove
                  </Button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-medium text-ink-800">Name *</label>
            <Input
              value={form.name}
              onChange={(e) => { set("name", e.target.value); if (!editing) set("slug", autoSlug(e.target.value)) }}
              placeholder={isDepartment ? "e.g. Raw Materials" : "e.g. Tiles"}
              disabled={saving}
            />
          </div>

          {/* Slug */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-medium text-ink-800">Slug *</label>
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder={isDepartment ? "e.g. raw-materials" : "e.g. tiles"}
              disabled={saving || Boolean(editing)}
              className={editing ? "bg-ink-50 text-ink-500" : ""}
            />
            <p className="text-xs text-ink-400">
              {editing ? "Slug cannot be changed after creation." : "Auto-filled from name. Lowercase + hyphens only."}
            </p>
          </div>

          {/* Description */}
          <div className="grid grid-cols-1 gap-1.5">
            <label className="text-sm font-medium text-ink-800">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description"
              rows={2} disabled={saving} className="resize-none text-sm"
            />
          </div>

          {/* Parent department (categories only) */}
          {needsParent && (
            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-sm font-medium text-ink-800">Parent department *</label>
              <select
                value={form.parentSlug}
                onChange={(e) => set("parentSlug", e.target.value)}
                disabled={saving}
                className="h-9 rounded-lg border border-border bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-600/20 disabled:opacity-60"
              >
                <option value="">— Select a department —</option>
                {parentOptions.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
              {parentOptions.length === 0 && (
                <p className="text-xs text-amber-600">
                  No departments yet. Create one first.
                </p>
              )}
            </div>
          )}

          {/* Order + active */}
          <div className="flex flex-wrap items-end gap-5">
            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-sm font-medium text-ink-800">Display order</label>
              <Input
                type="number" min={0} value={form.order}
                onChange={(e) => set("order", e.target.value)}
                disabled={saving} className="w-28"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-ink-800">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => patch({ isActive: e.target.checked })}
                disabled={saving}
                className="size-4 accent-brand-600"
              />
              Visible to customers
            </label>
          </div>

          {/* RFQ configuration — categories only */}
          {isCategory && (
            <div className="grid grid-cols-1 gap-1.5">
              <label className="text-sm font-medium text-ink-800">Quote configuration</label>
              <p className="-mt-1 text-xs text-ink-500">
                Define the variants and spec fields buyers fill when requesting a quote for this category.
              </p>
              <RfqConfigEditor
                variants={form.variants}
                attributes={form.attributes}
                onVariantsChange={(variants) => patch({ variants })}
                onAttributesChange={(attributes) => patch({ attributes })}
                disabled={saving}
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || uploadingImage} onClick={handleSave}>
            {saving
              ? <><Loader2 className="size-4 animate-spin" /> Saving…</>
              : editing ? "Save changes" : `Create ${MODE_LABEL[mode].toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
