import { useRef } from "react"
import { UploadCloud } from "lucide-react"

interface FileUploadAreaProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxSizeMb?: number
}

const FileUploadArea = ({ onFilesSelected, accept = "*", maxSizeMb = 100 }: FileUploadAreaProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const inputId = "codesync-file-upload-input"

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return

    const files = Array.from(fileList)
    const maxSizeBytes = maxSizeMb * 1024 * 1024
    const validFiles = files.filter((file) => file.size <= maxSizeBytes)

    onFilesSelected(validFiles)
  }

  return (
    <label
      htmlFor={inputId}
      className="rounded-2xl border-2 border-dashed border-neutral-700 bg-neutral-900/50 p-8 text-center transition-all hover:border-brand-400 hover:bg-neutral-900/80"
      onDrop={(event) => {
        event.preventDefault()
        handleFiles(event.dataTransfer.files)
      }}
      onDragOver={(event) => {
        event.preventDefault()
      }}
    >
      <UploadCloud className="mx-auto mb-3 h-10 w-10 text-brand-300" />
      <p className="text-sm font-medium text-neutral-200">Drop files here or click to browse</p>
      <p className="mt-1 text-xs text-neutral-500">Up to {maxSizeMb}MB per file with resumable chunk upload</p>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept={accept}
        title="Select files to upload"
        placeholder="Choose files"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </label>
  )
}

export { FileUploadArea }
