import clsx from "clsx"

interface SkeletonProps {
  className?: string
  rounded?: boolean
}

const Skeleton = ({ className, rounded = true }: SkeletonProps) => {
  return (
    <div
      className={clsx(
        "animate-pulse bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800",
        rounded ? "rounded-lg" : "",
        className
      )}
    />
  )
}

export { Skeleton }
