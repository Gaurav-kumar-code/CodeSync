import { Pause, Play, X } from "lucide-react"
import { Button, Progress } from "../ui/core"
import { UploadItem } from "../../hooks/useUpload"

interface UploadProgressProps {
  item: UploadItem
  onPause: () => void
  onResume: () => void
  onCancel: () => void
}

const UploadProgress = ({ item, onPause, onResume, onCancel }: UploadProgressProps) => {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="line-clamp-1 text-sm font-medium text-neutral-200">{item.file.name}</p>
          <p className="text-xs text-neutral-500">
            {(item.file.size / (1024 * 1024)).toFixed(2)} MB • {item.status}
          </p>
        </div>
        <span className="text-xs text-neutral-400">{item.progress}%</span>
      </div>

      <Progress
        value={item.progress}
        variant={item.status === "failed" ? "error" : item.status === "completed" ? "success" : "default"}
        loading={item.status === "uploading"}
      />

      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>{item.speedMbps ? `${item.speedMbps.toFixed(2)} MB/s` : "-"}</span>
        <span>{item.etaSeconds !== undefined ? `${item.etaSeconds}s remaining` : ""}</span>
      </div>

      <div className="flex gap-2">
        {item.status === "uploading" ? (
          <Button variant="ghost" size="sm" iconLeft={<Pause size={14} />} onClick={onPause}>
            Pause
          </Button>
        ) : null}
        {item.status === "paused" ? (
          <Button variant="ghost" size="sm" iconLeft={<Play size={14} />} onClick={onResume}>
            Resume
          </Button>
        ) : null}
        {item.status !== "completed" && item.status !== "canceled" ? (
          <Button variant="ghost" size="sm" iconLeft={<X size={14} />} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export { UploadProgress }
