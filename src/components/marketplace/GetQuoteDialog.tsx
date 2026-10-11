"use client"

import * as React from "react"
import { FileText, Loader2, SendHorizontal } from "lucide-react"

import { GlassSheet } from "@/components/common/glass-sheet"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { GetQuoteForm, type QuoteContext } from "./GetQuoteForm"

type Props = {
  context?: QuoteContext
  trigger?: React.ReactNode
  triggerLabel?: string
  triggerVariant?: React.ComponentProps<typeof Button>["variant"]
  triggerSize?: React.ComponentProps<typeof Button>["size"]
  triggerClassName?: string
}

/**
 * "Get a quote" without leaving the page. On phones it is a Liquid Glass
 * bottom sheet (drag the handle to dismiss) with the send button pinned in the
 * footer under the thumb; from md it is the centred dialog.
 */
export function GetQuoteDialog({
  context,
  trigger,
  triggerLabel = "Get a Quote",
  triggerVariant = "default",
  triggerSize = "sm",
  triggerClassName,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const isMobile = useIsMobile()
  const formId = React.useId()

  const title = context?.productName
    ? `Quote for ${context.productName}`
    : context?.supplierName
      ? `Quote from ${context.supplierName}`
      : context?.categoryName
        ? `Quote for ${context.categoryName}`
        : "Request a Quote"
  const description = "Tell the supplier what you need. They typically respond within 24 hours."

  function openDialog() {
    setSent(false)
    setOpen(true)
  }

  const triggerNode = trigger ? (
    React.cloneElement(trigger as React.ReactElement<{ onClick?: () => void }>, {
      onClick: openDialog,
    })
  ) : (
    <Button
      type="button"
      variant={triggerVariant}
      size={triggerSize}
      className={triggerClassName}
      onClick={openDialog}
    >
      <FileText className="size-4" />
      {triggerLabel}
    </Button>
  )

  return (
    <>
      {triggerNode}

      {isMobile ? (
        <GlassSheet
          open={open}
          onOpenChange={setOpen}
          title={title}
          description={description}
          footer={
            sent ? (
              <button
                key="done"
                type="button"
                className="btn-tactile btn-tactile--block"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            ) : (
              <button
                key="send"
                type="submit"
                form={formId}
                disabled={submitting}
                className="btn-tactile btn-tactile--block"
              >
                {submitting ? (
                  <>
                    <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <SendHorizontal aria-hidden="true" className="size-4" />
                    Send my request
                  </>
                )}
              </button>
            )
          }
        >
          <GetQuoteForm
            context={context}
            formId={formId}
            hideSubmit
            onSubmittingChange={setSubmitting}
            onSuccess={() => setSent(true)}
            onReset={() => setSent(false)}
          />
        </GlassSheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <GetQuoteForm
              context={context}
              onSuccess={() => {
                // Keep dialog open to show success state
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
