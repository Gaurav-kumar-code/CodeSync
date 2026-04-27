import clsx from "clsx"

type ProgressVariant = "default" | "success" | "warning" | "error"

interface ProgressProps {
  value: number
  showLabel?: boolean
  variant?: ProgressVariant
  loading?: boolean
}

const variantClassMap: Record<ProgressVariant, string> = {
  default: "bg-brand-500",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
}

const Progress = ({ value, showLabel = true, variant = "default", loading = false }: ProgressProps) => {
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)))

  return (
    <div className="space-y-1">
      <progress
        className={clsx(
          "h-2 w-full overflow-hidden rounded-full bg-neutral-800 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-neutral-800",
          "[&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full",
          variantClassMap[variant],
          loading ? "animate-pulse" : ""
        )}
        max={100}
        value={normalizedValue}
      />
      {showLabel ? <p className="text-right text-xs text-neutral-400">{normalizedValue}%</p> : null}
    </div>
  )
}

export { Progress }
