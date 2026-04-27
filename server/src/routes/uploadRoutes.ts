import { Router } from "express"
import multer from "multer"
import { body, param } from "express-validator"
import { requireAuth } from "../middleware/authMiddleware"
import { validateRequest } from "../middleware/validationMiddleware"
import { UploadService } from "../services/uploadService"

const uploadRoutes = Router()
const uploadMiddleware = multer({ storage: multer.memoryStorage() })

uploadRoutes.post(
  "/initiate",
  requireAuth,
  [
    body("fileName").isString().notEmpty(),
    body("fileSize").isNumeric(),
    body("mimeType").isString().notEmpty(),
    body("projectId").optional().isString(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const upload = await UploadService.initiateUpload({
        userId: String(req.user?._id),
        projectId: req.body.projectId,
        fileName: req.body.fileName,
        fileSize: Number(req.body.fileSize),
        mimeType: req.body.mimeType,
        checksum: req.body.checksum,
      })

      return res.status(201).json(upload)
    } catch (error) {
      return next(error)
    }
  }
)

uploadRoutes.post(
  "/chunk",
  requireAuth,
  uploadMiddleware.single("chunk"),
  [body("uploadId").isString().notEmpty(), body("chunkIndex").isInt({ min: 0 })],
  validateRequest,
  async (req, res, next) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ message: "Chunk binary is required" })
      }

      const upload = await UploadService.uploadChunk({
        uploadId: req.body.uploadId,
        userId: String(req.user?._id),
        chunkIndex: Number(req.body.chunkIndex),
        chunkData: req.file.buffer,
      })

      return res.status(200).json(upload)
    } catch (error) {
      return next(error)
    }
  }
)

uploadRoutes.post(
  "/complete",
  requireAuth,
  [body("uploadId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const upload = await UploadService.completeUpload({
        uploadId: req.body.uploadId,
        userId: String(req.user?._id),
      })

      return res.status(200).json(upload)
    } catch (error) {
      return next(error)
    }
  }
)

uploadRoutes.get(
  "/:uploadId/status",
  requireAuth,
  [param("uploadId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const status = await UploadService.getUploadStatus(req.params.uploadId, String(req.user?._id))
      return res.status(200).json(status)
    } catch (error) {
      return next(error)
    }
  }
)

uploadRoutes.delete(
  "/:uploadId",
  requireAuth,
  [param("uploadId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const upload = await UploadService.cancelUpload(req.params.uploadId, String(req.user?._id))
      return res.status(200).json(upload)
    } catch (error) {
      return next(error)
    }
  }
)

export { uploadRoutes }
