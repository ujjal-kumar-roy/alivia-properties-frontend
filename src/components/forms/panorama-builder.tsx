"use client"

import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ImagePlus, Loader2, Sparkles, Wand2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { VirtualTour } from "@/components/properties/virtual-tour"
import { useUploader } from "@/hooks/use-uploader"
import type { UploadKind } from "@/services/uploads.service"
import {
  assembleEquirectangular,
  canvasToFile,
  loadImage,
} from "@/utils/assemble-equirect"
import { cn } from "@/lib/utils"

const MIN_PHOTOS = 3

type PanoramaBuilderProps = {
  /** Existing listing photos the seller can pick from (URLs). */
  galleryUrls: string[]
  /** Called with the uploaded panorama URL once the seller accepts the result. */
  onBuilt: (url: string) => void
  /** Upload bucket kind — defaults to "property-image" for the existing Properties caller. */
  kind?: UploadKind
}

export function PanoramaBuilder({ galleryUrls, onBuilt, kind = "property-image" }: PanoramaBuilderProps) {
  const { upload } = useUploader(kind)
  const [open, setOpen] = useState(false)
  // Photos uploaded directly inside the builder (so it works even before any
  // listing photos exist — e.g. on the create page).
  const [extraUrls, setExtraUrls] = useState<string[]>([])
  // Selected photos, kept in the order the seller clicked them (= around the room).
  const [order, setOrder] = useState<string[]>([])
  const [addingPhotos, setAddingPhotos] = useState(false)
  const [building, setBuilding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Listing photos first, then any added in the builder — de-duplicated.
  const photos = useMemo(
    () => Array.from(new Set([...galleryUrls, ...extraUrls])),
    [galleryUrls, extraUrls],
  )

  // Revoke the object URL when it changes or the dialog unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    fileRef.current = null
  }

  function reset() {
    setOrder([])
    setExtraUrls([])
    setError(null)
    clearPreview()
  }

  function toggle(url: string) {
    setError(null)
    clearPreview() // changing the selection invalidates any existing preview
    setOrder((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    )
  }

  async function addPhotos(list: FileList | null) {
    if (!list || list.length === 0) return
    setError(null)
    setAddingPhotos(true)
    try {
      const urls = await upload(Array.from(list))
      if (urls.length === 0) {
        setError("Upload failed — please try again.")
        return
      }
      setExtraUrls((prev) => [...prev, ...urls])
      // Photos added here are clearly meant for the tour — auto-select them (in
      // upload order) so "Build preview" is immediately usable.
      clearPreview()
      setOrder((prev) => [...prev, ...urls.filter((u) => !prev.includes(u))])
    } finally {
      setAddingPhotos(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function build() {
    setError(null)
    setBuilding(true)
    try {
      const images = await Promise.all(order.map((url) => loadImage(url)))
      const canvas = assembleEquirectangular(images)
      const file = await canvasToFile(canvas)
      fileRef.current = file
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not build the panorama. Try different photos.",
      )
    } finally {
      setBuilding(false)
    }
  }

  async function useResult() {
    if (!fileRef.current) return
    setError(null)
    setSaving(true)
    try {
      const urls = await upload([fileRef.current])
      if (urls.length === 0) {
        setError("Upload failed — please try again.")
        return
      }
      onBuilt(urls[0])
      setOpen(false)
      reset()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-brand-200 text-brand-700 hover:bg-brand-50"
          />
        }
      >
        <Wand2 className="h-4 w-4" />
        Build a 360° from photos
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto overscroll-contain sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Build a 360° tour from your photos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-ink-500">
            Add or pick photos{" "}
            <span className="font-medium text-ink-700">
              in the order they go around the room
            </span>{" "}
            (left → right). We&apos;ll stitch them into a navigable 360° tour.
            Best with {MIN_PHOTOS}–8 wide shots taken from the centre of the
            room. This is an assembled tour, not a captured panorama.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void addPhotos(e.target.files)}
          />

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((url) => {
              const index = order.indexOf(url)
              const selected = index !== -1
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => toggle(url)}
                  className={cn(
                    "group relative aspect-4/3 overflow-hidden rounded-[0.75rem] border outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand-500",
                    selected
                      ? "border-brand-600 ring-2 ring-brand-500/40"
                      : "border-border hover:border-brand-300",
                  )}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    unoptimized
                    sizes="120px"
                    className="object-cover"
                  />
                  {selected && (
                    <span className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-brand-700 text-[0.75rem] font-bold text-white shadow">
                      {index + 1}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Always-available tile to add more source photos. */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={addingPhotos}
              className="flex aspect-4/3 flex-col items-center justify-center gap-1 rounded-[0.75rem] border border-dashed border-brand-300 bg-brand-50/40 text-xs font-medium text-brand-700 outline-none transition-colors hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60"
            >
              {addingPhotos ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
              {addingPhotos ? "Uploading…" : "Add photos"}
            </button>
          </div>

          {photos.length === 0 && (
            <p className="text-center text-xs text-ink-500">
              No photos yet. Add a few room shots to get started.
            </p>
          )}

          {previewUrl && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
                <Sparkles className="size-3.5" />
                Preview — drag to look around
              </p>
              <VirtualTour
                posterImage={previewUrl}
                panoramaUrl={previewUrl}
                title="Assembled 360° preview"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-ink-600">
              {order.length} selected
              {order.length > 0 && order.length < MIN_PHOTOS
                ? ` · pick ${MIN_PHOTOS - order.length} more`
                : ""}
            </span>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 rounded-full sm:h-8 sm:flex-none"
                disabled={order.length < MIN_PHOTOS || building}
                onClick={build}
              >
                {building ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Building…
                  </>
                ) : previewUrl ? (
                  "Rebuild"
                ) : (
                  "Build preview"
                )}
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 rounded-full bg-brand-700 text-white hover:bg-brand-800 sm:h-8 sm:flex-none"
                disabled={!previewUrl || saving}
                onClick={useResult}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Use this tour
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
