import { ButtonHTMLAttributes, ReactNode } from "react"
import clsx from "clsx"

type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-neutral-900 hover:bg-brand-400 shadow-[0_10px_24px_rgba(65,200,122,0.25)]",
  secondary:
    "bg-neutral-900 text-neutral-50 hover:bg-neutral-800 border border-neutral-700",
  tertiary: "bg-accent-500 text-neutral-50 hover:bg-accent-400",
  ghost: "bg-transparent text-neutral-200 hover:bg-neutral-800/70 border border-neutral-700",
}

const sizeClassMap: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
}

const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  iconLeft,
  iconRight,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 ease-out",
        "enabled:hover:scale-[1.02] enabled:active:scale-[0.99]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variantClassMap[variant],
        sizeClassMap[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : iconLeft}
      <span>{children}</span>
      {!loading ? iconRight : null}
    </button>
  )
}

export { Button }
