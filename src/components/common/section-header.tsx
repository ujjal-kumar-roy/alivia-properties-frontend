import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  eyebrow?: string
  title: string
  /** Heading element for the title; pages use "h1" for their one page title. */
  as?: "h1" | "h2"
  subtitle?: string
  align?: "left" | "center" | "right"
  className?: string
}

export function SectionHeader({ eyebrow, title, as: Heading = "h2", subtitle, align = "center", className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "space-y-2 sm:space-y-4",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      {eyebrow && (
        <div
          className={cn(
            "hidden sm:block",
            align === "center" && "sm:flex sm:justify-center",
            align === "right" && "sm:flex sm:justify-end",
          )}
        >
          <p className="eyebrow-pill">{eyebrow}</p>
        </div>
      )}
      <Heading
        className={cn(
          "text-h2 text-balance max-w-4xl",
          align === "center" && "mx-auto",
          align === "right" && "ml-auto",
        )}
      >
        {title}
      </Heading>
      {subtitle && (
        <p
          className={cn(
            "text-lead text-balance max-w-2xl",
            align === "center" && "mx-auto",
            align === "right" && "ml-auto",
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
