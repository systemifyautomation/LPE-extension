import { type ButtonHTMLAttributes, forwardRef } from "react"
import { clsx } from "clsx"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size    = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-lpe-navy text-white hover:bg-[#0a1c4a] active:bg-[#071540] " +
    "shadow-sm disabled:opacity-60",
  secondary:
    "bg-lpe-orange text-white hover:bg-[#c96e10] active:bg-[#b05f0e] " +
    "shadow-sm disabled:opacity-60",
  ghost:
    "bg-transparent text-lpe-navy border border-lpe-border " +
    "hover:bg-lpe-gray active:bg-lpe-border disabled:opacity-60",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 " +
    "shadow-sm disabled:opacity-60"
}

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-md gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-5 py-2.5 text-base rounded-lg gap-2"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center font-semibold",
          "transition-colors duration-150 cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lpe-orange focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
