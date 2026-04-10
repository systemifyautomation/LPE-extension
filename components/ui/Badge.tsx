import { clsx } from "clsx"
import type { DealStatus } from "~lib/types"

type BadgeVariant = "navy" | "orange" | "green" | "yellow" | "red" | "gray"

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  navy:   "bg-lpe-navy/10 text-lpe-navy",
  orange: "bg-lpe-orange/15 text-lpe-orange",
  green:  "bg-emerald-50 text-emerald-700",
  yellow: "bg-amber-50 text-amber-700",
  red:    "bg-red-50 text-red-700",
  gray:   "bg-lpe-gray text-lpe-gray-dark"
}

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// Convenience: maps DealStatus to a Badge
export function DealStatusBadge({ status }: { status: DealStatus }) {
  const map: Record<DealStatus, { label: string; variant: BadgeVariant }> = {
    active:   { label: "Active",   variant: "green"  },
    pending:  { label: "Pending",  variant: "yellow" },
    closed:   { label: "Closed",   variant: "navy"   },
    "on-hold":{ label: "On Hold",  variant: "gray"   }
  }

  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}
