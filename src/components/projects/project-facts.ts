import type { ProjectUnit } from "@/types/project.types"

export type ProjectFactKey =
  | "address"
  | "landArea"
  | "floors"
  | "totalUnits"
  | "availableUnits"
  | "soldUnits"
  | "unitSize"
  | "bedrooms"
  | "bathrooms"
  | "handover"

export type ProjectFact = {
  key: ProjectFactKey
  label: string
  value: string
  /** Set on plain unit counts so the desktop card can count the number up. */
  count?: number
}

type ProjectFactsInput = {
  address?: string
  locationText: string
  landSize?: number
  landSizeUnit?: string
  totalFloors?: number
  totalUnits?: number
  availableUnits?: number
  soldUnits?: number
  handover?: string
  units?: ProjectUnit[]
}

export function numberRange(values: Array<number | undefined>): string | null {
  const present = values.filter((value): value is number => value != null)
  if (present.length === 0) return null

  const minimum = Math.min(...present)
  const maximum = Math.max(...present)
  const format = (value: number) => value.toLocaleString("en-BD")

  return minimum === maximum
    ? format(minimum)
    : `${format(minimum)}-${format(maximum)}`
}

export function buildProjectFacts(input: ProjectFactsInput): ProjectFact[] {
  const facts: Array<ProjectFact | null> = []
  const units = input.units ?? []
  const sizeRange = numberRange(units.map((unit) => unit.size))
  const bedroomRange = numberRange(units.map((unit) => unit.bedrooms))
  const bathroomRange = numberRange(units.map((unit) => unit.bathrooms))
  const sizeUnit = units.find((unit) => unit.sizeUnit)?.sizeUnit ?? "sq ft"

  facts.push({
    key: "address",
    label: "Address",
    value: input.address?.trim() || input.locationText,
  })
  if (input.landSize != null) {
    facts.push({
      key: "landArea",
      label: "Land area",
      value: `${input.landSize.toLocaleString("en-BD")} ${input.landSizeUnit ?? "katha"}`,
    })
  }
  if (input.totalFloors != null) {
    facts.push({ key: "floors", label: "Floors", value: `${input.totalFloors} Floors` })
  }
  if (input.totalUnits != null) {
    facts.push({ key: "totalUnits", label: "Total units", value: `${input.totalUnits} Units`, count: input.totalUnits })
  }
  if (input.availableUnits != null) {
    facts.push({ key: "availableUnits", label: "Available apartments", value: `${input.availableUnits} Units`, count: input.availableUnits })
  }
  if (input.soldUnits != null) {
    facts.push({ key: "soldUnits", label: "Sold apartments", value: `${input.soldUnits} Units`, count: input.soldUnits })
  }
  if (sizeRange) {
    facts.push({ key: "unitSize", label: "Unit size", value: `${sizeRange} ${sizeUnit}` })
  }
  if (bedroomRange) {
    facts.push({ key: "bedrooms", label: "Bedrooms", value: bedroomRange })
  }
  if (bathroomRange) {
    facts.push({ key: "bathrooms", label: "Bathrooms", value: bathroomRange })
  }
  if (input.handover) {
    facts.push({ key: "handover", label: "Handover", value: input.handover })
  }

  return facts.filter((fact): fact is ProjectFact => fact != null)
}
