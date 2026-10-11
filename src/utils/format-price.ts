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
