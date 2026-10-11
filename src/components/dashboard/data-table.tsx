import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
  /** When true, this column is hidden from the phone card (it stays a column from sm up). */
  hideOnMobile?: boolean
  /** When true, this column is the title of the phone card. Falls back to the first column. */
  primaryOnMobile?: boolean
  /** Phones: pin this column to the card's top-right corner (use it for the status badge). */
  badgeOnMobile?: boolean
  /** Phones: put this column in the card footer, right-aligned (row actions). A column keyed `actions` does this by default. */
  actionsOnMobile?: boolean
  /** Phones: label shown next to the value. `false` shows the value on its own. Defaults to `header`. */
  mobileLabel?: string | false
  /** Phones: let this fact take a full row (long text such as a message preview). */
  wideOnMobile?: boolean
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  emptyMessage?: string
  className?: string
  rowKey?: (row: T, index: number) => string
  /** Phones: a bespoke card body per row instead of the generic title / badge / facts / actions layout. */
  renderCard?: (row: T, index: number) => ReactNode
  /**
   * How rows appear on phones.
   * - `cards` (default): each row becomes a compact card.
   * - `scroll`: the table stays a table inside a horizontal scroller, first column pinned. Use it
   *   only when the data is truly tabular and a card would lose the comparison between rows.
   */
  mobileView?: "cards" | "scroll"
}

/**
 * Server-compatible on purpose: server pages hand it `render` functions, so it must stay free of
 * hooks and "use client". Anything interactive (menus, sheets) belongs in the cells.
 *
 * sm and up: a glass table. Phones: one compact card per row, in one scannable column.
 */
export function DataTable<T>({
  columns,
  data,
  emptyMessage = "No records found.",
  className,
  rowKey,
  renderCard,
  mobileView = "cards",
}: DataTableProps<T>) {
  const scrollOnPhones = mobileView === "scroll"
  const primary = columns.find((c) => c.primaryOnMobile) ?? columns[0]
  const badge = columns.find((c) => c.badgeOnMobile && c !== primary)
  const actions = columns.find((c) => (c.actionsOnMobile || c.key === "actions") && c !== primary)
  const facts = columns.filter(
    (c) => c !== primary && c !== badge && c !== actions && !c.hideOnMobile,
  )

  return (
    <div className={cn("w-full max-w-full min-w-0", className)}>
      {/* Table: sm and up (every size when mobileView is "scroll") */}
      <div
        className={cn(
          "surface-card w-full max-w-full min-w-0 overflow-hidden",
          !scrollOnPhones && "hidden sm:block",
        )}
      >
        <div className="w-full max-w-full min-w-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-linear-to-b from-ink-50 to-white/95">
              <tr className="border-b border-border/70">
                {columns.map((col, ci) => (
                  <th
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap px-3 py-3 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-500 sm:px-4 sm:py-3.5 sm:tracking-[0.18em]",
                      scrollOnPhones && ci === 0 && "max-sm:sticky max-sm:left-0 max-sm:z-10 max-sm:bg-ink-50",
                      // Row actions stay on screen when the table scrolls sideways (tablets, small laptops).
                      col.key === "actions" && "sticky right-0 z-10 bg-white",
                      col.className,
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-12 text-center text-sm text-ink-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={rowKey ? rowKey(row, i) : i}
                    className={cn(
                      "group border-b border-border/50 transition-colors last:border-b-0",
                      i % 2 === 1 ? "bg-ink-50/40" : "bg-white",
                      "hover:bg-brand-50/50",
                    )}
                  >
                    {columns.map((col, ci) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-3 align-middle sm:px-4 sm:py-3.5",
                          scrollOnPhones &&
                            ci === 0 &&
                            "max-sm:sticky max-sm:left-0 max-sm:z-[1] max-sm:bg-white max-sm:shadow-[1px_0_0_var(--color-border)]",
                          col.key === "actions" &&
                            "sticky right-0 z-[1] bg-white transition-colors group-hover:bg-brand-50",
                          col.className,
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phone cards */}
      {scrollOnPhones ? null : (
        <div className="sm:hidden">
          {data.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-white px-4 py-10 text-center text-sm text-ink-600 shadow-(--shadow-card)">
              {emptyMessage}
            </div>
          ) : (
            <ul className="space-y-2">
              {data.map((row, i) => (
                <li
                  key={rowKey ? rowKey(row, i) : i}
                  data-card
                  className="rounded-2xl border border-border/60 bg-white px-3.5 py-3 shadow-(--shadow-card)"
                >
                  {renderCard ? (
                    renderCard(row, i)
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">{primary.render(row)}</div>
                        {badge ? <div className="shrink-0 pt-0.5">{badge.render(row)}</div> : null}
                      </div>

                      {facts.length > 0 || actions ? (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                          {facts.length > 0 ? (
                            <dl className="flex min-w-0 flex-1 basis-40 flex-wrap gap-x-3.5 gap-y-1">
                              {facts.map((col) => (
                                <div
                                  key={col.key}
                                  className={cn(
                                    "flex min-w-0 items-baseline gap-1.5 text-xs",
                                    col.wideOnMobile && "basis-full",
                                  )}
                                >
                                  {col.mobileLabel === false ? null : (
                                    <dt className="shrink-0 text-[0.6875rem] font-medium text-ink-500">
                                      {col.mobileLabel ?? col.header}
                                    </dt>
                                  )}
                                  <dd className="min-w-0 font-medium text-ink-800">
                                    {col.render(row)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          ) : null}
                          {actions ? (
                            <div className="ml-auto shrink-0">{actions.render(row)}</div>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
