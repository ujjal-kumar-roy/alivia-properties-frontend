"use client"

import { useEffect, useMemo, useState } from "react"
import { Landmark } from "lucide-react"
import { banksService } from "@/services/banks.service"
import type { Bank } from "@/types/bank.types"

function emi(principal: number, annualRatePct: number, years: number): number {
  const rate = annualRatePct / 100 / 12
  const months = years * 12
  if (rate === 0) return principal / months
  return (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1)
}

function formatBdt(amount: number): string {
  if (amount >= 100000) return `৳${(amount / 100000).toFixed(2)} L`
  return `৳${Math.round(amount).toLocaleString("en-BD")}`
}

export function EmiBankCompare({
  propertyPrice,
  embedded = false,
}: {
  propertyPrice: number
  /** Inside an accordion: no card or heading of its own (the section supplies them). */
  embedded?: boolean
}) {
  const [banks, setBanks] = useState<Bank[]>([])

  useEffect(() => {
    void banksService.list().then(setBanks).catch(() => setBanks([]))
  }, [])

  const rows = useMemo(() => {
    return banks
      .map((bank) => {
        const principal = Math.min(
          propertyPrice * (1 - bank.minDownPaymentPct / 100),
          bank.maxLoanAmount,
        )

        return {
          ...bank,
          principal,
          monthlyEmi: emi(principal, bank.interestRate, bank.maxTenureYears),
        }
      })
      .sort((left, right) => left.monthlyEmi - right.monthlyEmi)
  }, [banks, propertyPrice])

  return (
    <div className={embedded ? undefined : "surface-card p-5"}>
      {!embedded && (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Landmark className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-h3">Bank EMI Comparison</h3>
            <p className="text-xs text-ink-500">Live partner-bank rates from the backend</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left text-[0.65rem] uppercase tracking-[0.18em] text-ink-500">
              <th className="px-3 py-2.5">Bank</th>
              <th className="px-3 py-2.5">Rate</th>
              <th className="px-3 py-2.5">Down</th>
              <th className="px-3 py-2.5">Tenure</th>
              <th className="px-3 py-2.5">EMI / mo</th>
              <th className="px-3 py-2.5">Approval</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((bank) => (
              <tr key={bank.id} className="border-b border-border/40 last:border-b-0">
                <td className="px-3 py-3 font-semibold text-ink-900">{bank.name}</td>
                <td className="px-3 py-3 text-ink-700">{bank.interestRate}%</td>
                <td className="px-3 py-3 text-ink-700">{bank.minDownPaymentPct}%</td>
                <td className="px-3 py-3 text-ink-700">{bank.maxTenureYears} yrs</td>
                <td className="px-3 py-3 font-semibold text-brand-700">{formatBdt(bank.monthlyEmi)}</td>
                <td className="px-3 py-3 text-ink-500">{bank.approvalDays} d</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-ink-500">
                  No bank data available right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
