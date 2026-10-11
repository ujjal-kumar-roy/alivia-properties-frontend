import { Camera, Video } from "lucide-react";

import {
  SwipeGallery,
  type GallerySlide,
} from "@/components/marketplace/SwipeGallery";
import {
  buildSupplierMediaItems,
  isDirectSupplierVideo,
  supplierInitials,
  toSupplierVideoEmbedUrl,
} from "@/components/marketplace/supplier-media-utils";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/types/marketplace.types";

/**
 * The supplier's showroom: a swipeable stage (video first when there is one,
 * then the photos), with a photo count and a "Video" chip over it. Phones swipe
 * and tap for the full-screen viewer; `sm` and up add arrows and thumbnails.
 */
export function SupplierMediaShowcase({
  supplier,
  className,
}: {
  supplier: Supplier;
  className?: string;
}) {
  const { items, images } = buildSupplierMediaItems(supplier);
  const embedUrl = toSupplierVideoEmbedUrl(supplier.videoUrl);

  const slides: GallerySlide[] = items.map((item) =>
    item.type === "image"
      ? { kind: "image", src: item.src, alt: `${supplier.name} photo` }
      : {
          kind: "video",
          poster: item.poster,
          label: `${supplier.name} video`,
          source: embedUrl
            ? { type: "embed", src: embedUrl, title: `${supplier.name} video` }
            : isDirectSupplierVideo(item.url)
              ? { type: "file", src: item.url }
              : { type: "link", href: item.url },
        },
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/12 bg-white/8 shadow-[0_30px_90px_rgba(7,28,21,0.35)] backdrop-blur-md sm:rounded-[2rem]",
        className,
      )}
    >
      <SwipeGallery
        slides={slides}
        name={supplier.name}
        unoptimized
        priority
        thumbTone="dark"
        aspectClassName="aspect-4/3 sm:aspect-16/11"
        overlay={
          <>
            {images.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <Camera aria-hidden="true" className="size-3.5" />
                {images.length} Photo{images.length === 1 ? "" : "s"}
              </span>
            ) : null}
            {supplier.videoUrl ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <Video aria-hidden="true" className="size-3.5" />
                Video
              </span>
            ) : null}
          </>
        }
        empty={
          <div className="flex aspect-4/3 w-full items-center justify-center bg-linear-to-br from-brand-100 via-brand-200 to-gold-100 sm:aspect-16/11">
            <span className="font-heading text-6xl font-semibold text-brand-700/35 sm:text-7xl">
              {supplierInitials(supplier.name)}
            </span>
          </div>
        }
      />
    </div>
  );
}
