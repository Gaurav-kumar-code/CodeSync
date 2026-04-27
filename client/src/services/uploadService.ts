import axios from "axios"
import { apiClient, API_BASE_URL } from "./api"

export interface InitiateUploadResponse {
  _id: string
  fileName: string
  fileSize: number
  chunkSize: number
  totalChunks: number
  uploadedChunksCount: number
  status: "uploading" | "completed" | "failed" | "canceled"
}

const initiateUpload = async (payload: {
  fileName: string
  fileSize: number
  mimeType: string
  projectId?: string
  checksum?: string
}) => {
  const response = await apiClient.post<InitiateUploadResponse>("/uploads/initiate", payload)
  return response.data
}

const uploadChunk = async (payload: {
  uploadId: string
  chunkIndex: number
  chunk: Blob
  onProgress?: (percentage: number) => void
}) => {
  const formData = new FormData()
  formData.append("uploadId", payload.uploadId)
  formData.append("chunkIndex", String(payload.chunkIndex))
  formData.append("chunk", payload.chunk)

  const token = localStorage.getItem("code-sync:access-token")

  const response = await axios.post(`${API_BASE_URL}/uploads/chunk`, formData, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (event) => {
      if (!payload.onProgress || !event.total) {
        return
      }

      const percentage = Math.round((event.loaded / event.total) * 100)
      payload.onProgress(percentage)
    },
  })

  return response.data
}

const completeUpload = async (uploadId: string) => {
  const response = await apiClient.post(`/uploads/complete`, { uploadId })
  return response.data
}

const getUploadStatus = async (uploadId: string) => {
  const response = await apiClient.get(`/uploads/${uploadId}/status`)
  return response.data as {
    upload: InitiateUploadResponse
    progressPercent: number
  }
}

const cancelUpload = async (uploadId: string) => {
  const response = await apiClient.delete(`/uploads/${uploadId}`)
  return response.data
}

export const uploadService = {
  initiateUpload,
  uploadChunk,
  completeUpload,
  getUploadStatus,
  cancelUpload,
}
