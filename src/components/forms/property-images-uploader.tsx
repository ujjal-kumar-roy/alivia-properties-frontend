"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Loader2, Star, Trash2, UploadCloud, X } from "lucide-react"

import { GlassSheet } from "@/components/common/glass-sheet"
import { useUploader } from "@/hooks/use-uploader"
import { UPLOAD_RULES, type UploadKind } from "@/services/uploads.service"
import { cn } from "@/lib/utils"

type PropertyImagesUploaderProps = {
  /** Ordered image URLs. Index 0 is the cover. */
  value: string[]
  onChange: (urls: string[]) => void
  minImages?: number
  maxImages?: number
  disabled?: boolean
  /** Which storage bucket/rules to use (default property photos). */
  kind?: Extract<UploadKind, "property-image" | "project-image">
  /** Label above the grid. */
  label?: string
}

/** Always on screen on touch devices; with a mouse the overlay controls appear on hover or focus. */
const REVEAL_ON_HOVER =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-within:opacity-100"

export function PropertyImagesUploader({
  value,
  onChange,
  minImages = 5,
  maxImages = 12,
  disabled,
  kind = "property-image",
  label = "Photos",
}: PropertyImagesUploaderProps) {
  const { upload, uploading, error, setError, discard } = useUploader(kind)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  // Phones: the photo whose options sheet is open (reorder, cover, remove at 44px targets).
  const [sheetIndex, setSheetIndex] = useState<number | null>(null)

  const rule = UPLOAD_RULES[kind]
  const atCapacity = value.length >= maxImages
  const remainingToMin = Math.max(0, minImages - value.length)

  async function ingest(list: FileList | File[] | null) {
    if (!list || disabled || uploading) return
    const incoming = Array.from(list)
    if (incoming.length === 0) return

    setError(null)
    const room = maxImages - value.length
    let files = incoming
    if (files.length > room) {
      setError(`You can add up to ${maxImages} photos.`)
      files = files.slice(0, room)
    }
    if (files.length === 0) return

    const urls = await upload(files)
    if (urls.length === 0) return
    onChange([...value, ...urls].slice(0, maxImages))
    if (inputRef.current) inputRef.current.value = ""
  }

  function removeAt(index: number) {
    if (disabled) return
    discard(value[index])
    onChange(value.filter((_, i) => i !== index))
  }

  function move(index: number, dir: -1 | 1) {
    if (disabled) return
    const next = index + dir
    if (next < 0 || next >= value.length) return
    const copy = [...value]
    ;[copy[index], copy[next]] = [copy[next], copy[index]]
    onChange(copy)
  }

  function makeCover(index: number) {
    if (disabled || index === 0) return
    const copy = [...value]
    const [picked] = copy.splice(index, 1)
    copy.unshift(picked)
    onChange(copy)
  }

  const sheetOpen = sheetIndex !== null && sheetIndex < value.length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-medium leading-none text-ink-800">{label}</p>
        <p
          aria-live="polite"
          className={cn(
            "text-xs font-medium tabular-nums",
            remainingToMin > 0 ? "text-amber-700" : "text-emerald-700",
          )}
        >
          {value.length}/{maxImages} added
          {remainingToMin > 0
            ? ` · ${remainingToMin} more to reach the ${minImages} minimum`
            : " · minimum met"}
        </p>
      </div>

      {!atCapacity && (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void ingest(e.dataTransfer.files)
          }}
          className={cn(
            "flex min-h-36 w-full touch-manipulation flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed p-4 text-center outline-none transition-[background-color,border-color,scale] focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-32 sm:border",
            dragOver
              ? "border-brand-500 bg-brand-50"
              : "border-brand-200 bg-brand-50/40 hover:bg-brand-50",
          )}
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin text-brand-600" />
          ) : (
            <UploadCloud className="size-6 text-brand-600" />
          )}
          <p className="mt-2 text-sm font-semibold text-ink-800">
            {uploading ? (
              "Uploading..."
            ) : (
              <>
                <span className="sm:hidden">Tap to add photos</span>
                <span className="hidden sm:inline">Click or drag photos to upload</span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-ink-600">
            {minImages > 0 ? `${minImages}-${maxImages} recommended · ` : ""}max{" "}
            {(rule.maxBytes / 1024 / 1024).toFixed(0)} MB each
          </p>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={rule.accept}
        multiple
        className="hidden"
        onChange={(e) => void ingest(e.target.files)}
      />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {value.map((url, index) => (
            <li
              key={url}
              className={cn(
                "group relative aspect-4/3 overflow-hidden rounded-xl border sm:rounded-[1rem]",
                index === 0 ? "border-brand-500 ring-1 ring-brand-500/30" : "border-border",
              )}
            >
              <Image src={url} alt={`Photo ${index + 1}`} fill sizes="(max-width: 768px) 33vw, 200px" unoptimized className="object-cover" />

              {index === 0 && (
                <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-brand-700 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-white shadow-sm sm:left-1.5 sm:top-1.5 sm:px-2">
                  <Star className="size-3 fill-current" />
                  Cover
                </span>
              )}

              {!disabled && (
                <>
                  {/* Phones: tapping the photo opens its options sheet. */}
                  <button
                    type="button"
                    onClick={() => setSheetIndex(index)}
                    aria-label={`Photo ${index + 1} options`}
                    className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:hidden"
                  />

                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    aria-label={`Remove photo ${index + 1}`}
                    className={cn(
                      "absolute right-1 top-1 z-10 flex size-8 items-center justify-center rounded-full bg-black/60 text-white outline-none transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white sm:right-1.5 sm:top-1.5 sm:size-7",
                      REVEAL_ON_HOVER,
                    )}
                  >
                    <X className="size-4" />
                  </button>

                  {/* sm and up: reorder and cover controls over the photo */}
                  <div
                    className={cn(
                      "absolute inset-x-1.5 bottom-1.5 hidden items-center justify-between gap-1 transition-opacity sm:flex",
                      REVEAL_ON_HOVER,
                    )}
                  >
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move photo ${index + 1} earlier`}
                        className="flex size-7 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40"
                      >
                        <ArrowLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === value.length - 1}
                        aria-label={`Move photo ${index + 1} later`}
                        className="flex size-7 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40"
                      >
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                    {index !== 0 && (
                      <button
                        type="button"
                        onClick={() => makeCover(index)}
                        className="rounded-full bg-white/90 px-2.5 py-1 text-[0.6875rem] font-semibold text-brand-700 shadow-sm outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-brand-500"
                      >
                        Set cover
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <GlassSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setSheetIndex(null)
        }}
        title={sheetIndex !== null ? `Photo ${sheetIndex + 1} of ${value.length}` : "Photo"}
      >
        {sheetIndex !== null ? (
          <div className="grid gap-2 pb-2">
            {sheetIndex !== 0 ? (
              <button
                type="button"
                className="btn-glass min-h-11 justify-start px-4"
                onClick={() => {
                  makeCover(sheetIndex)
                  setSheetIndex(null)
                }}
              >
                <Star className="size-4" />
                Set as cover photo
              </button>
            ) : null}
            <button
              type="button"
              className="btn-glass min-h-11 justify-start px-4 disabled:opacity-50"
              disabled={sheetIndex === 0}
              onClick={() => {
                move(sheetIndex, -1)
                setSheetIndex(null)
              }}
            >
              <ArrowLeft className="size-4" />
              Move earlier
            </button>
            <button
              type="button"
              className="btn-glass min-h-11 justify-start px-4 disabled:opacity-50"
              disabled={sheetIndex === value.length - 1}
              onClick={() => {
                move(sheetIndex, 1)
                setSheetIndex(null)
              }}
            >
              <ArrowRight className="size-4" />
              Move later
            </button>
            <button
              type="button"
              className="btn-glass min-h-11 justify-start px-4 text-red-700"
              onClick={() => {
                removeAt(sheetIndex)
                setSheetIndex(null)
              }}
            >
              <Trash2 className="size-4" />
              Remove photo
            </button>
          </div>
        ) : null}
      </GlassSheet>
    </div>
  )
}
