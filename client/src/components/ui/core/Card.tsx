import { HTMLAttributes } from "react"
import clsx from "clsx"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean
}

const Card = ({ children, className, selected = false, ...props }: CardProps) => {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-neutral-900/75 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] backdrop-blur-sm",
        "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,0,0,0.25)]",
        selected ? "border-brand-400" : "border-neutral-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Card }
