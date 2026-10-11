"use client"

import { BadgeCheck, Clock3, FileText } from "lucide-react"
import type { PropertyDocument } from "@/types/document.types"

const DOC_LABELS: Record<PropertyDocument["type"], string> = {
  title_deed: "Title Deed",
  mutation: "Mutation",
  tax_receipt: "Tax Receipt",
  approval_plan: "Approval Plan",
  noc: "NOC",
  survey_report: "Survey Report",
  utility_bill: "Utility Bill",
  agreement: "Agreement",
  other: "Document",
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentVault({
  documents,
  embedded = false,
}: {
  documents: PropertyDocument[]
  /** Inside an accordion: no card or heading of its own (the section supplies them). */
  embedded?: boolean
}) {
  const verifiedCount = documents.filter((d) => d.isVerified).length

  return (
    <div className={embedded ? undefined : "surface-card p-5"}>
      {!embedded && (
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-h3">Document Vault</h3>
            <p className="mt-1 text-xs text-ink-500">
              {verifiedCount} of {documents.length} verified
            </p>
          </div>
        </div>
      )}
      <ul className="divide-y divide-border/60">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center gap-3 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">
                {doc.label || DOC_LABELS[doc.type]}
              </p>
              <p className="text-xs text-ink-500">{formatBytes(doc.fileSize)}</p>
            </div>
            {doc.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <BadgeCheck className="h-3 w-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Clock3 className="h-3 w-3" />
                Pending
              </span>
            )}
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-xs font-semibold text-brand-700 hover:underline"
            >
              View
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
