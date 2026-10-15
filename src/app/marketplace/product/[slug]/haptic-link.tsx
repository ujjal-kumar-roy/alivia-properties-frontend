"use client"

import Link from "next/link"
import type { ComponentProps } from "react"

import { haptic } from "@/lib/celebrate"

/** A Link that gives a light haptic tap on phones that support it. */
export function HapticLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        haptic("tap")
        onClick?.(event)
      }}
    />
  )
}
