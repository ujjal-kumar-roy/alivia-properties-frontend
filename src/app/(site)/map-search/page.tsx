export const dynamic = "force-dynamic"

import { getProperties } from "@/services/properties.service"
import { PropertyCard } from "@/components/properties/property-card"
import { MapSearchShell } from "@/pages-sections/properties/map-search-shell"
import { ROUTES } from "@/config/routes.config"
import { MapPin, Search } from "lucide-react"

interface MapSearchPageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function MapSearchPage({ searchParams }: MapSearchPageProps) {
  const { search } = await searchParams
  const term = search?.trim() || undefined
  const res = await getProperties({ limit: 8, search: term })
  const total = res.meta?.total ?? res.data.length

  return (
    <MapSearchShell
      count={`${total.toLocaleString("en-BD")} ${total === 1 ? "property" : "properties"}`}
      header={
        <>
          <h1 className="font-heading text-lg font-bold tracking-tight lg:font-sans lg:text-base">
            Map Search
          </h1>
          {/* A plain GET form: it searches without any client code. */}
          <form
            action={ROUTES.MAP_SEARCH}
            method="get"
            role="search"
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 focus-within:ring-1 focus-within:ring-brand-400"
          >
            <Search aria-hidden="true" className="size-4 shrink-0 text-brand-600" />
            <input
              type="search"
              name="search"
              defaultValue={term}
              enterKeyHint="search"
              autoComplete="off"
              aria-label="Search area, apartment or address"
              placeholder="Search area, apartment, address…"
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-ink-400"
            />
          </form>
        </>
      }
      list={
        res.data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-ink-500">
            No properties match that search.
          </p>
        ) : (
          <div className="space-y-2.5 lg:space-y-3">
            {res.data.map((p, i) => (
              <div key={p.id} className="reveal min-w-0">
                <PropertyCard property={p} eager={i < 3} />
              </div>
            ))}
          </div>
        )
      }
      map={
        <div className="flex min-h-[55dvh] w-full items-center justify-center rounded-2xl bg-muted lg:min-h-64 lg:flex-1 lg:rounded-none">
          <div className="space-y-3 text-center text-muted-foreground">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/50">
                <MapPin className="h-8 w-8 opacity-40" />
              </div>
            </div>
            <p className="text-sm font-medium">Interactive Map</p>
            <p className="mx-auto max-w-xs px-4 text-xs">
              {/* TODO: Replace with Google Maps / Mapbox integration */}
              The map view is coming soon. Browse the list for now.
            </p>
          </div>
        </div>
      }
    />
  )
}
