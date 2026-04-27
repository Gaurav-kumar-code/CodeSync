import { useState } from "react"
import { Button } from "../ui/core"
import { FileUploadArea } from "./FileUploadArea"
import { UploadProgress } from "./UploadProgress"
import { useUpload } from "../../hooks/useUpload"

const UploadManager = ({ projectId }: { projectId?: string }) => {
  const { uploads, queueFiles, uploadAll, pauseUpload, resumeUpload, cancelUpload, clearFinished } = useUpload()
  const [isUploading, setIsUploading] = useState(false)

  const onStartUploads = async () => {
    setIsUploading(true)
    try {
      await uploadAll(projectId)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-100">Upload Manager</h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={clearFinished}>
            Clear Finished
          </Button>
          <Button size="sm" onClick={onStartUploads} loading={isUploading}>
            Upload All
          </Button>
        </div>
      </div>

      <FileUploadArea onFilesSelected={queueFiles} maxSizeMb={100} />

      <div className="space-y-3">
        {uploads.map((item) => (
          <UploadProgress
            key={item.id}
            item={item}
            onPause={() => pauseUpload(item.id)}
            onResume={() => resumeUpload(item.id)}
            onCancel={() => cancelUpload(item.id)}
          />
        ))}
      </div>
    </section>
  )
}

export { UploadManager }
