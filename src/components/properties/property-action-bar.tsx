"use client"

import { useState } from "react"
import { MessageCircle, Phone, Send } from "lucide-react"
import { GlassSheet } from "@/components/common/glass-sheet"
import { MobileActionBar } from "@/components/common/mobile-action-bar"
import { SellerInquiryForm } from "@/components/properties/seller-inquiry-form"
import { siteConfig } from "@/config/site.config"

type PropertyActionBarProps = {
  propertyId: string
  propertyTitle: string
  sellerName: string
  sellerPhone?: string
  /** Full wa.me link, or null when the seller has no WhatsApp number. */
  whatsappHref: string | null
}

/**
 * The phone thumb bar for a listing: call, WhatsApp, and the primary action,
 * which opens the same inquiry form the page has in a bottom sheet. Hidden from
 * md by `MobileActionBar`; on desktop the contact card in the sidebar does this job.
 */
export function PropertyActionBar({
  propertyId,
  propertyTitle,
  sellerName,
  sellerPhone,
  whatsappHref,
}: PropertyActionBarProps) {
  const [open, setOpen] = useState(false)
  const phone = sellerPhone || siteConfig.contact.phoneRaw

  return (
    <>
      <MobileActionBar
        label="Contact the seller"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-8 motion-safe:duration-500 motion-safe:ease-out"
      >
        <a
          href={`tel:${phone}`}
          aria-label={`Call ${sellerName}`}
          className="btn-glass size-11 min-h-11 min-w-11 shrink-0 !p-0"
        >
          <Phone aria-hidden="true" className="size-5" />
        </a>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${sellerName}`}
            className="btn-glass size-11 min-h-11 min-w-11 shrink-0 !p-0"
          >
            <MessageCircle aria-hidden="true" className="size-5" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="btn-tactile flex-1"
        >
          <Send aria-hidden="true" className="size-4" />
          Enquire now
        </button>
      </MobileActionBar>

      <GlassSheet
        open={open}
        onOpenChange={setOpen}
        title="Enquire about this property"
        description={propertyTitle}
      >
        <SellerInquiryForm
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          sellerName={sellerName}
        />
      </GlassSheet>
    </>
  )
}
