import { Clock3, FileCode, HardDrive, Users } from "lucide-react"
import { Link } from "react-router-dom"
import { Avatar, Card } from "../ui/core"

interface ProjectCardProps {
  project: {
    _id: string
    name: string
    description: string
    statistics?: {
      fileCount?: number
      totalSizeBytes?: number
      lastModifiedAt?: string
    }
    owner?: {
      profile?: {
        username?: string
        avatar?: string
      }
    }
    collaborators?: Array<{
      user?: {
        profile?: {
          username?: string
          avatar?: string
        }
      }
    }>
  }
}

const bytesToHuman = (bytes: number) => {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const collaborators = project.collaborators ?? []
  const ownerName = project.owner?.profile?.username ?? "Unknown"
  const updatedAt = project.statistics?.lastModifiedAt ?? new Date().toISOString()

  return (
    <Card className="group flex h-full flex-col justify-between">
      <div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-lg font-semibold text-neutral-100">{project.name}</h3>
          <span className="rounded-full bg-brand-500/20 px-2 py-1 text-xs font-semibold text-brand-300">Live</span>
        </div>
        <p className="line-clamp-2 text-sm text-neutral-400">{project.description || "No description provided."}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-neutral-300">
          <div className="inline-flex items-center gap-1">
            <FileCode size={14} />
            {project.statistics?.fileCount ?? 0} files
          </div>
          <div className="inline-flex items-center gap-1">
            <HardDrive size={14} />
            {bytesToHuman(project.statistics?.totalSizeBytes ?? 0)}
          </div>
          <div className="inline-flex items-center gap-1">
            <Users size={14} />
            {collaborators.length} collaborators
          </div>
          <div className="inline-flex items-center gap-1">
            <Clock3 size={14} />
            {new Date(updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <Avatar src={project.owner?.profile?.avatar} name={ownerName} size="sm" status="online" />
          <span className="text-xs text-neutral-400">Owner: {ownerName}</span>
        </div>
        <Link
          to={`/editor/${project._id}`}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-brand-400 hover:text-brand-300"
        >
          Open
        </Link>
      </div>
    </Card>
  )
}

export { ProjectCard }
