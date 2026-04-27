import { AlertTriangle, CheckCircle2, Code2, FilePenLine } from "lucide-react"

interface ActivityItem {
  _id: string
  actionType: string
  createdAt: string
  success?: boolean
  user?: {
    profile?: {
      username?: string
    }
  }
}

const iconMap: Record<string, JSX.Element> = {
  FILE_UPDATED: <FilePenLine size={14} className="text-sky-400" />,
  CODE_EXECUTED: <Code2 size={14} className="text-brand-300" />,
  ERROR: <AlertTriangle size={14} className="text-red-400" />,
}

const ActivityLog = ({ activities }: { activities: ActivityItem[] }) => {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-300">Recent Activity</h3>
      <div className="space-y-3">
        {activities.length === 0 ? <p className="text-sm text-neutral-500">No recent activity yet.</p> : null}
        {activities.map((activity) => (
          <div key={activity._id} className="flex items-center gap-3 text-sm text-neutral-300">
            <span>{iconMap[activity.actionType] ?? <CheckCircle2 size={14} className="text-neutral-500" />}</span>
            <span className="line-clamp-1 flex-1">
              <strong>{activity.user?.profile?.username ?? "System"}</strong> {activity.actionType.replaceAll("_", " ")}
            </span>
            <span className="text-xs text-neutral-500">{new Date(activity.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { ActivityLog }
