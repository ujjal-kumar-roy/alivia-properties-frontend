"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, FolderPlus, Layers, Package, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { MarketplaceCategory } from "@/services/marketplace.service"
import { CategoryFormDialog } from "./CategoryFormDialog"
import { CategoryRow } from "./CategoryRow"
import { DeleteDialog } from "./DeleteDialog"
import { detectMode, type DialogMode } from "./types"

export function AdminMarketplaceCategoriesPanel({
  initialCategories,
}: {
  initialCategories: MarketplaceCategory[]
}) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>("department")
  const [defaultParent, setDefaultParent] = useState("")
  const [editing, setEditing] = useState<MarketplaceCategory | null>(null)
  const [deletingCat, setDeletingCat] = useState<MarketplaceCategory | null>(null)
  const [flashSlug, setFlashSlug] = useState<string | null>(null)
  const [filterText, setFilterText] = useState("")
  // Phones fold each department's categories away; the first one starts open. From md up they are always shown.
  const [openDepts, setOpenDepts] = useState<Record<string, boolean>>(() => {
    const first = initialCategories
      .filter((c) => (c.level ?? (c.parentSlug ? "CATEGORY" : "DEPARTMENT")) === "DEPARTMENT")
      .sort((a, b) => a.order - b.order)[0]
    return first ? { [first.slug]: true } : {}
  })

  const lvl = (c: MarketplaceCategory) => c.level ?? (c.parentSlug ? "CATEGORY" : "DEPARTMENT")
  const sortOrder = (a: MarketplaceCategory, b: MarketplaceCategory) => a.order - b.order

  const departments = categories.filter((c) => lvl(c) === "DEPARTMENT").sort(sortOrder)
  const categoriesUnder = (deptSlug: string) =>
    categories.filter((c) => lvl(c) === "CATEGORY" && c.parentSlug === deptSlug).sort(sortOrder)

  const q = filterText.trim().toLowerCase()
  const matches = (c: MarketplaceCategory) =>
    !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)

  function openCreate(mode: DialogMode, parent = "") {
    setEditing(null)
    setDialogMode(mode)
    setDefaultParent(parent)
    setDialogOpen(true)
  }

  function openEdit(cat: MarketplaceCategory) {
    setEditing(cat)
    setDialogMode(detectMode(cat))
    setDefaultParent(cat.parentSlug ?? "")
    setDialogOpen(true)
  }

  function openAddChild(parent: MarketplaceCategory) {
    openCreate("category", parent.slug)
  }

  function handleSaved(cat: MarketplaceCategory) {
    setCategories((prev) => {
      const exists = prev.some((c) => c.slug === cat.slug)
      return exists ? prev.map((c) => (c.slug === cat.slug ? cat : c)) : [...prev, cat]
    })
    setFlashSlug(cat.slug)
    window.setTimeout(() => setFlashSlug(null), 2000)
    // Show the saved row on phones: open the department it lives under.
    setOpenDepts((current) => ({ ...current, [cat.parentSlug ?? cat.slug]: true }))
    // Purge Next's client Router Cache so the public marketplace pages
    // (force-dynamic) re-fetch fresh data on the next navigation in this session.
    router.refresh()
  }

  function handleDeleted(slug: string) {
    setCategories((prev) => {
      // Deleting a department also drops its categories.
      const doomed = new Set([slug, ...prev.filter((c) => c.parentSlug === slug).map((c) => c.slug)])
      return prev.filter((c) => !doomed.has(c.slug))
    })
    router.refresh()
  }

  const flash = (slug: string) =>
    flashSlug === slug && "ring-2 ring-brand-400 ring-offset-2 rounded-xl"

  const totalDepartments = departments.length
  const categoryNodes = categories.filter((c) => lvl(c) === "CATEGORY")
  const totalCategories = categoryNodes.length
  const withImages = categoryNodes.filter((c) => c.image?.url || c.iconUrl).length

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats + controls */}
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
          <Stat label="Departments" value={totalDepartments} />
          <Stat label="Categories" value={totalCategories} />
          <Stat label="Category images" value={withImages} accent="brand" />
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            placeholder="Filter…"
            aria-label="Filter categories"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="h-11 w-full rounded-full text-sm sm:h-9 sm:w-40"
          />
          <Button
            variant="outline"
            onClick={() => openCreate("department")}
            className="flex-1 rounded-full gap-1.5 border-brand-300 text-brand-700 hover:bg-brand-50 max-sm:h-10 sm:flex-none"
          >
            <FolderPlus className="size-4" /> Department
          </Button>
          <Button
            onClick={() => openCreate("category")}
            className="flex-1 rounded-full gap-1.5 max-sm:h-10 sm:flex-none"
          >
            <Package className="size-4" /> Category
          </Button>
        </div>
      </div>

      {/* Explainer */}
      <div className="hidden rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-brand-800 sm:block">
        Build the tree top-down: <strong>Departments</strong> → <strong>Categories</strong>.
        Categories are the leaf buyers browse to reach suppliers — they carry the image tile and
        quote configuration shown in the wizard. Use the <Plus className="inline size-3" /> on a
        department to add a category.
      </div>

      {/* Tree */}
      {departments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-ink-500">
          <Layers className="mx-auto mb-2 size-8 text-ink-300" />
          <p className="text-sm font-medium">No departments yet.</p>
          <p className="mt-1 text-xs">
            Click <strong>Department</strong> to start, then add categories.
          </p>
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-8">
          {departments
            .filter((d) => matches(d) || categoriesUnder(d.slug).some(matches))
            .map((dept) => {
              const cats = categoriesUnder(dept.slug).filter(matches)
              // A filter in use shows every match; otherwise phones follow the toggle.
              const open = Boolean(q) || Boolean(openDepts[dept.slug])
              const listClass = open ? "block" : "hidden md:block"
              return (
                <div key={dept.slug} className="space-y-2">
                  <div className={cn(flash(dept.slug))}>
                    <CategoryRow
                      cat={dept}
                      depth={0}
                      onEdit={openEdit}
                      onDelete={setDeletingCat}
                      onAddChild={openAddChild}
                      childCount={cats.length}
                      expanded={open}
                      onToggle={() =>
                        setOpenDepts((current) => ({ ...current, [dept.slug]: !current[dept.slug] }))
                      }
                    />
                  </div>

                  {cats.length === 0 ? (
                    <div className="ml-3 rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-xs text-ink-600 sm:ml-6">
                      No categories under this department.{" "}
                      <button
                        type="button"
                        onClick={() => openAddChild(dept)}
                        className="font-medium text-brand-700 underline-offset-2 hover:underline"
                      >
                        Add the first one
                      </button>
                      .
                    </div>
                  ) : (
                    <div className={cn("space-y-2", listClass)}>
                      {cats.map((category) => (
                        <div key={category.slug} className={cn(flash(category.slug))}>
                          <CategoryRow
                            cat={category}
                            depth={1}
                            onEdit={openEdit}
                            onDelete={setDeletingCat}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {flashSlug && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-lg">
          <CheckCircle2 className="size-4" /> Saved successfully
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        editing={editing}
        categories={categories}
        defaultParent={defaultParent}
        onSaved={handleSaved}
      />

      <DeleteDialog cat={deletingCat} onClose={() => setDeletingCat(null)} onDeleted={handleDeleted} />
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "brand" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white px-3 py-2 sm:px-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={cn("text-xl font-bold", accent === "brand" ? "text-brand-700" : "text-ink-900")}>
        {value}
      </p>
    </div>
  )
}
