import { ReactNode, useState } from "react"
import clsx from "clsx"
import { X } from "lucide-react"

type BadgeVariant = "default" | "success" | "warning" | "error" | "info"

interface BadgeProps {
  text: string
  variant?: BadgeVariant
  icon?: ReactNode
  removable?: boolean
  onRemove?: () => void
}

const variantClassMap: Record<BadgeVariant, string> = {
  default: "bg-neutral-800 text-neutral-200",
  success: "bg-emerald-500/20 text-emerald-300",
  warning: "bg-amber-500/20 text-amber-300",
  error: "bg-red-500/20 text-red-300",
  info: "bg-sky-500/20 text-sky-300",
}

const Badge = ({ text, variant = "default", icon, removable = false, onRemove }: BadgeProps) => {
  const [hidden, setHidden] = useState(false)

  if (hidden) {
    return null
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        "animate-fade-in",
        variantClassMap[variant]
      )}
    >
      {icon}
      <span>{text}</span>
      {removable ? (
        <button
          type="button"
          className="rounded-full p-0.5 transition-colors hover:bg-black/20"
          onClick={() => {
            setHidden(true)
            onRemove?.()
          }}
          aria-label="Remove badge"
        >
          <X size={12} />
        </button>
      ) : null}
    </span>
  )
}

export { Badge }
