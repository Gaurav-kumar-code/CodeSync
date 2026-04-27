import { useCallback, useMemo, useRef, useState } from "react"
import { uploadService } from "../services/uploadService"

type UploadStatus = "idle" | "uploading" | "paused" | "completed" | "failed" | "canceled"

export interface UploadItem {
  id: string
  file: File
  uploadId?: string
  progress: number
  status: UploadStatus
  error?: string
  speedMbps?: number
  etaSeconds?: number
}

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024

export const useUpload = () => {
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const pausedIdsRef = useRef<Set<string>>(new Set())
  const canceledIdsRef = useRef<Set<string>>(new Set())

  const updateItem = useCallback((id: string, updater: (item: UploadItem) => UploadItem) => {
    setUploads((previous) => previous.map((item) => (item.id === id ? updater(item) : item)))
  }, [])

  const queueFiles = useCallback((files: File[]) => {
    setUploads((previous) => [
      ...files.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
        file,
        progress: 0,
        status: "idle" as UploadStatus,
      })),
      ...previous,
    ])
  }, [])

  const startUpload = useCallback(
    async (item: UploadItem, projectId?: string) => {
      try {
        const initiated = await uploadService.initiateUpload({
          fileName: item.file.name,
          fileSize: item.file.size,
          mimeType: item.file.type || "application/octet-stream",
          projectId,
        })

        updateItem(item.id, (previous) => ({
          ...previous,
          uploadId: initiated._id,
          status: "uploading",
        }))

        const totalChunks = Math.ceil(item.file.size / DEFAULT_CHUNK_SIZE)
        let uploadedBytes = 0
        const startedAt = performance.now()

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
          if (canceledIdsRef.current.has(item.id)) {
            await uploadService.cancelUpload(initiated._id)
            updateItem(item.id, (previous) => ({ ...previous, status: "canceled" }))
            return
          }

          while (pausedIdsRef.current.has(item.id)) {
            await new Promise((resolve) => setTimeout(resolve, 180))
          }

          const start = chunkIndex * DEFAULT_CHUNK_SIZE
          const end = Math.min(start + DEFAULT_CHUNK_SIZE, item.file.size)
          const chunk = item.file.slice(start, end)

          await uploadService.uploadChunk({
            uploadId: initiated._id,
            chunkIndex,
            chunk,
          })

          uploadedBytes += chunk.size
          const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.1)
          const speedBytesPerSecond = uploadedBytes / elapsedSeconds
          const remainingBytes = item.file.size - uploadedBytes

          updateItem(item.id, (previous) => ({
            ...previous,
            progress: Math.round((uploadedBytes / item.file.size) * 100),
            speedMbps: speedBytesPerSecond / (1024 * 1024),
            etaSeconds: remainingBytes > 0 ? Math.round(remainingBytes / speedBytesPerSecond) : 0,
          }))
        }

        await uploadService.completeUpload(initiated._id)
        updateItem(item.id, (previous) => ({
          ...previous,
          progress: 100,
          status: "completed",
        }))
      } catch (error: any) {
        updateItem(item.id, (previous) => ({
          ...previous,
          status: "failed",
          error: error?.response?.data?.message || error?.message || "Upload failed",
        }))
      }
    },
    [updateItem]
  )

  const uploadAll = useCallback(
    async (projectId?: string) => {
      for (const item of uploads) {
        if (item.status === "idle" || item.status === "failed") {
          await startUpload(item, projectId)
        }
      }
    },
    [startUpload, uploads]
  )

  const pauseUpload = useCallback((id: string) => {
    pausedIdsRef.current.add(id)
    updateItem(id, (item) => ({ ...item, status: "paused" }))
  }, [updateItem])

  const resumeUpload = useCallback((id: string) => {
    pausedIdsRef.current.delete(id)
    updateItem(id, (item) => ({ ...item, status: "uploading" }))
  }, [updateItem])

  const cancelUpload = useCallback((id: string) => {
    canceledIdsRef.current.add(id)
    updateItem(id, (item) => ({ ...item, status: "canceled" }))
  }, [updateItem])

  const clearFinished = useCallback(() => {
    setUploads((previous) => previous.filter((item) => !["completed", "canceled"].includes(item.status)))
  }, [])

  const activeCount = useMemo(
    () => uploads.filter((item) => ["uploading", "paused"].includes(item.status)).length,
    [uploads]
  )

  return {
    uploads,
    activeCount,
    queueFiles,
    uploadAll,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    clearFinished,
  }
}
