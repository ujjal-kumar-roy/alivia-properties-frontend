const CRORE = 10_000_000
const LAKH = 100_000

export function formatPrice(amount: number, short = false): string {
  if (short) {
    if (amount >= CRORE) {
      const crore = amount / CRORE
      return `৳${crore % 1 === 0 ? crore : crore.toFixed(2)} Cr`
    }
    if (amount >= LAKH) {
      const lakh = amount / LAKH
      return `৳${lakh % 1 === 0 ? lakh : lakh.toFixed(1)} L`
    }
    return `৳${amount.toLocaleString("en-BD")}`
  }

  if (amount >= CRORE) {
    const crore = amount / CRORE
    const rem = (amount % CRORE) / LAKH
    if (rem === 0) return `৳${crore} Crore`
    return `৳${crore.toFixed(0)} Crore ${rem.toFixed(0)} Lakh`
  }

  if (amount >= LAKH) {
    const lakh = amount / LAKH
    return `৳${lakh % 1 === 0 ? lakh : lakh.toFixed(1)} Lakh`
  }

  return `৳${amount.toLocaleString("en-BD")}`
}

export function formatPriceRange(min: number, max: number): string {
  return `${formatPrice(min, true)} - ${formatPrice(max, true)}`
}

export function formatRent(amount: number): string {
  return `৳${amount.toLocaleString("en-BD")}/month`
}

// Exact taka amounts for marketplace prices (cards, rows, buy box, quote list).
// A fixed locale so the server and every browser print the same string: en-IN groups
// the South Asian way Bangladeshi buyers read (৳5,50,000); "en-BD" falls back to
// plain en grouping in some ICU builds, which risks hydration mismatches.
const takaFraction = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 })
const takaWhole = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })

/** ৳ amount with lakh grouping. Whole taka from ৳100 up; small unit prices keep paisa (৳11.5). */
export function formatTaka(amount: number): string {
  return `৳${(Math.abs(amount) >= 100 ? takaWhole : takaFraction).format(amount)}`
}
