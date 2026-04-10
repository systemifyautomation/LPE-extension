import { clsx } from "clsx"

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: "none" | "sm" | "md" | "lg"
  hover?: boolean
  onClick?: () => void
}

const paddingClasses = {
  none: "",
  sm:   "p-3",
  md:   "p-4",
  lg:   "p-5"
}

export function Card({
  children,
  className,
  padding = "md",
  hover = false,
  onClick
}: CardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => { if (e.key === "Enter" || e.key === " ") onClick() }
          : undefined
      }
      className={clsx(
        "bg-white rounded-xl border border-lpe-border shadow-sm",
        paddingClasses[padding],
        hover &&
          "cursor-pointer transition-shadow duration-150 hover:shadow-lpe hover:border-lpe-blue/30",
        onClick && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lpe-orange",
        className
      )}
    >
      {children}
    </div>
  )
}
