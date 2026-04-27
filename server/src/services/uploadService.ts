import fs from "fs"
import path from "path"
import { pipeline } from "stream/promises"
import { createReadStream, createWriteStream } from "fs"
import { promises as fsp } from "fs"
import { env } from "../config/env"
import { UploadModel } from "../models"
import { LogService } from "./logService"
import { HttpError } from "../utils/httpError"

const ensureDirectory = async (directoryPath: string) => {
  await fsp.mkdir(directoryPath, { recursive: true })
}

const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_")

class UploadService {
  static async initiateUpload(params: {
    userId: string
    projectId?: string
    fileName: string
    fileSize: number
    mimeType: string
    chunkSize?: number
    checksum?: string
  }) {
    const chunkSize = params.chunkSize ?? env.chunkSize

    if (params.fileSize > env.maxFileSize) {
      throw new HttpError(400, `File exceeds max allowed size of ${env.maxFileSize} bytes`)
    }

    const totalChunks = Math.ceil(params.fileSize / chunkSize)

    const tempDir = path.join(process.cwd(), env.uploadDir, "temp", `${Date.now()}-${Math.random().toString(16).slice(2)}`)
    await ensureDirectory(tempDir)

    const upload = await UploadModel.create({
      user: params.userId,
      project: params.projectId,
      fileName: sanitizeFileName(params.fileName),
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      checksum: params.checksum,
      chunkSize,
      totalChunks,
      tempDir,
      status: "uploading",
    })

    await LogService.createLog({
      actionType: "UPLOAD_INITIATED",
      userId: params.userId,
      projectId: params.projectId,
      details: {
        uploadId: String(upload._id),
        fileName: params.fileName,
        totalChunks,
      },
    })

    return upload
  }

  static async uploadChunk(params: {
    uploadId: string
    userId: string
    chunkIndex: number
    chunkData: Buffer
  }) {
    const upload = await UploadModel.findById(params.uploadId)

    if (!upload) {
      throw new HttpError(404, "Upload session not found")
    }

    if (String(upload.user) !== params.userId) {
      throw new HttpError(403, "Upload does not belong to the authenticated user")
    }

    if (upload.status !== "uploading") {
      throw new HttpError(400, "Upload is not in uploading state")
    }

    if (params.chunkIndex < 0 || params.chunkIndex >= upload.totalChunks) {
      throw new HttpError(400, "Invalid chunk index")
    }

    const chunkFilePath = path.join(upload.tempDir, `${params.chunkIndex}.chunk`)
    await ensureDirectory(upload.tempDir)
    await fsp.writeFile(chunkFilePath, new Uint8Array(params.chunkData))

    const uploadedChunkSet = new Set(upload.uploadedChunks)
    uploadedChunkSet.add(params.chunkIndex)

    upload.uploadedChunks = Array.from(uploadedChunkSet).sort((a, b) => a - b)
    upload.uploadedChunksCount = upload.uploadedChunks.length

    await upload.save()

    await LogService.createLog({
      actionType: "UPLOAD_CHUNK",
      userId: params.userId,
      projectId: upload.project ? String(upload.project) : undefined,
      details: {
        uploadId: String(upload._id),
        chunkIndex: params.chunkIndex,
        uploadedChunksCount: upload.uploadedChunksCount,
        totalChunks: upload.totalChunks,
      },
    })

    return upload
  }

  static async completeUpload(params: { uploadId: string; userId: string }) {
    const upload = await UploadModel.findById(params.uploadId)

    if (!upload) {
      throw new HttpError(404, "Upload session not found")
    }

    if (String(upload.user) !== params.userId) {
      throw new HttpError(403, "Upload does not belong to the authenticated user")
    }

    if (upload.uploadedChunksCount !== upload.totalChunks) {
      throw new HttpError(400, "Upload is incomplete")
    }

    const finalDir = path.join(process.cwd(), env.filesDir)
    await ensureDirectory(finalDir)

    const finalFilePath = path.join(finalDir, `${upload._id}-${upload.fileName}`)
    const targetStream = createWriteStream(finalFilePath)

    try {
      for (let index = 0; index < upload.totalChunks; index += 1) {
        const chunkPath = path.join(upload.tempDir, `${index}.chunk`)

        if (!fs.existsSync(chunkPath)) {
          throw new HttpError(400, `Missing chunk ${index}`)
        }

        await pipeline(createReadStream(chunkPath), targetStream, { end: false })
      }

      targetStream.end()

      upload.status = "completed"
      upload.storagePath = finalFilePath
      upload.errorMessage = ""
      await upload.save()

      await this.cleanupTempDirectory(upload.tempDir)

      await LogService.createLog({
        actionType: "UPLOAD_COMPLETED",
        userId: params.userId,
        projectId: upload.project ? String(upload.project) : undefined,
        details: {
          uploadId: String(upload._id),
          storagePath: finalFilePath,
        },
      })

      return upload
    } catch (error: any) {
      upload.status = "failed"
      upload.errorMessage = error?.message ?? "Upload merge failed"
      await upload.save()

      await LogService.createLog({
        actionType: "UPLOAD_FAILED",
        userId: params.userId,
        projectId: upload.project ? String(upload.project) : undefined,
        success: false,
        errorMessage: upload.errorMessage,
        details: {
          uploadId: String(upload._id),
        },
      })

      throw error
    }
  }

  static async getUploadStatus(uploadId: string, userId: string) {
    const upload = await UploadModel.findById(uploadId)

    if (!upload) {
      throw new HttpError(404, "Upload session not found")
    }

    if (String(upload.user) !== userId) {
      throw new HttpError(403, "Upload does not belong to the authenticated user")
    }

    return {
      upload,
      progressPercent:
        upload.totalChunks > 0
          ? Math.round((upload.uploadedChunksCount / upload.totalChunks) * 100)
          : 0,
    }
  }

  static async cancelUpload(uploadId: string, userId: string) {
    const upload = await UploadModel.findById(uploadId)

    if (!upload) {
      throw new HttpError(404, "Upload session not found")
    }

    if (String(upload.user) !== userId) {
      throw new HttpError(403, "Upload does not belong to the authenticated user")
    }

    upload.status = "canceled"
    upload.errorMessage = "Upload canceled by user"
    await upload.save()

    await this.cleanupTempDirectory(upload.tempDir)

    return upload
  }

  static async cleanupTempDirectory(tempDir: string) {
    try {
      await fsp.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      console.error("Failed to cleanup temp directory", tempDir, error)
    }
  }

  static async cleanupExpiredUploadArtifacts() {
    const expiredUploads = await UploadModel.find({
      status: { $in: ["failed", "canceled"] },
      updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })

    for (const upload of expiredUploads) {
      await this.cleanupTempDirectory(upload.tempDir)
    }
  }
}

export { UploadService }
