import clsx from "clsx"

type AvatarSize = "sm" | "md" | "lg"

type UserStatus = "online" | "away" | "offline"

interface AvatarProps {
  src?: string
  name: string
  size?: AvatarSize
  status?: UserStatus
  stacked?: boolean
  title?: string
}

const sizeClassMap: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
}

const statusClassMap: Record<UserStatus, string> = {
  online: "bg-emerald-400 animate-pulse",
  away: "bg-amber-400",
  offline: "bg-neutral-500",
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

const Avatar = ({ src, name, size = "md", status = "offline", stacked = false, title }: AvatarProps) => {
  return (
    <div
      className={clsx("relative inline-flex", stacked ? "-ml-2 first:ml-0" : "")}
      title={title ?? name}
      aria-label={name}
    >
      {src ? (
        <img
          className={clsx(
            "rounded-full border border-neutral-700 object-cover",
            sizeClassMap[size],
            stacked ? "ring-2 ring-neutral-950" : ""
          )}
          src={src}
          alt={name}
        />
      ) : (
        <span
          className={clsx(
            "inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 font-semibold text-neutral-100",
            sizeClassMap[size],
            stacked ? "ring-2 ring-neutral-950" : ""
          )}
        >
          {getInitials(name)}
        </span>
      )}
      <span
        className={clsx(
          "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-neutral-950",
          statusClassMap[status]
        )}
      />
    </div>
  )
}

export { Avatar }
