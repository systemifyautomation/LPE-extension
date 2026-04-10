import { clsx } from "clsx"

interface SpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  label?: string
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-7 w-7 border-2",
  lg: "h-10 w-10 border-[3px]"
}

export function Spinner({ size = "md", className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? "Loading…"}
      className={clsx("inline-flex items-center justify-center", className)}
    >
      <span
        className={clsx(
          "rounded-full border-lpe-navy/20 border-t-lpe-navy animate-spin",
          sizeClasses[size]
        )}
      />
    </span>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center h-full w-full py-12">
      <Spinner size="lg" />
    </div>
  )
}
