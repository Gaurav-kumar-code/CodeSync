import { InputHTMLAttributes, ReactNode, useMemo } from "react"
import clsx from "clsx"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  iconLeft?: ReactNode
  iconRight?: ReactNode
  maxLength?: number
}

const Input = ({
  label,
  error,
  helperText,
  iconLeft,
  iconRight,
  className,
  value,
  maxLength,
  id,
  ...props
}: InputProps) => {
  const currentLength = useMemo(() => String(value ?? "").length, [value])

  return (
    <label className="flex w-full flex-col gap-2" htmlFor={id}>
      {label ? <span className="text-sm font-medium text-neutral-200">{label}</span> : null}
      <div
        className={clsx(
          "group flex items-center gap-2 rounded-xl border bg-neutral-900/70 px-3 transition-all duration-200",
          "focus-within:border-brand-400 focus-within:shadow-[0_0_0_3px_rgba(65,200,122,0.2)]",
          error ? "border-red-500" : "border-neutral-700",
          className
        )}
      >
        {iconLeft ? <span className="text-neutral-400">{iconLeft}</span> : null}
        <input
          id={id}
          value={value}
          maxLength={maxLength}
          className="h-11 w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
          {...props}
        />
        {iconRight ? <span className="text-neutral-400">{iconRight}</span> : null}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={error ? "text-red-400" : "text-neutral-500"}>{error || helperText}</span>
        {typeof maxLength === "number" ? (
          <span className="text-neutral-500">{currentLength}/{maxLength}</span>
        ) : null}
      </div>
    </label>
  )
}

export { Input }
