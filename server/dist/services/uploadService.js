"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("stream/promises");
const fs_2 = require("fs");
const fs_3 = require("fs");
const env_1 = require("../config/env");
const models_1 = require("../models");
const logService_1 = require("./logService");
const httpError_1 = require("../utils/httpError");
const ensureDirectory = async (directoryPath) => {
    await fs_3.promises.mkdir(directoryPath, { recursive: true });
};
const sanitizeFileName = (fileName) => fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
class UploadService {
    static async initiateUpload(params) {
        const chunkSize = params.chunkSize ?? env_1.env.chunkSize;
        if (params.fileSize > env_1.env.maxFileSize) {
            throw new httpError_1.HttpError(400, `File exceeds max allowed size of ${env_1.env.maxFileSize} bytes`);
        }
        const totalChunks = Math.ceil(params.fileSize / chunkSize);
        const tempDir = path_1.default.join(process.cwd(), env_1.env.uploadDir, "temp", `${Date.now()}-${Math.random().toString(16).slice(2)}`);
        await ensureDirectory(tempDir);
        const upload = await models_1.UploadModel.create({
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
        });
        await logService_1.LogService.createLog({
            actionType: "UPLOAD_INITIATED",
            userId: params.userId,
            projectId: params.projectId,
            details: {
                uploadId: String(upload._id),
                fileName: params.fileName,
                totalChunks,
            },
        });
        return upload;
    }
    static async uploadChunk(params) {
        const upload = await models_1.UploadModel.findById(params.uploadId);
        if (!upload) {
            throw new httpError_1.HttpError(404, "Upload session not found");
        }
        if (String(upload.user) !== params.userId) {
            throw new httpError_1.HttpError(403, "Upload does not belong to the authenticated user");
        }
        if (upload.status !== "uploading") {
            throw new httpError_1.HttpError(400, "Upload is not in uploading state");
        }
        if (params.chunkIndex < 0 || params.chunkIndex >= upload.totalChunks) {
            throw new httpError_1.HttpError(400, "Invalid chunk index");
        }
        const chunkFilePath = path_1.default.join(upload.tempDir, `${params.chunkIndex}.chunk`);
        await ensureDirectory(upload.tempDir);
        await fs_3.promises.writeFile(chunkFilePath, new Uint8Array(params.chunkData));
        const uploadedChunkSet = new Set(upload.uploadedChunks);
        uploadedChunkSet.add(params.chunkIndex);
        upload.uploadedChunks = Array.from(uploadedChunkSet).sort((a, b) => a - b);
        upload.uploadedChunksCount = upload.uploadedChunks.length;
        await upload.save();
        await logService_1.LogService.createLog({
            actionType: "UPLOAD_CHUNK",
            userId: params.userId,
            projectId: upload.project ? String(upload.project) : undefined,
            details: {
                uploadId: String(upload._id),
                chunkIndex: params.chunkIndex,
                uploadedChunksCount: upload.uploadedChunksCount,
                totalChunks: upload.totalChunks,
            },
        });
        return upload;
    }
    static async completeUpload(params) {
        const upload = await models_1.UploadModel.findById(params.uploadId);
        if (!upload) {
            throw new httpError_1.HttpError(404, "Upload session not found");
        }
        if (String(upload.user) !== params.userId) {
            throw new httpError_1.HttpError(403, "Upload does not belong to the authenticated user");
        }
        if (upload.uploadedChunksCount !== upload.totalChunks) {
            throw new httpError_1.HttpError(400, "Upload is incomplete");
        }
        const finalDir = path_1.default.join(process.cwd(), env_1.env.filesDir);
        await ensureDirectory(finalDir);
        const finalFilePath = path_1.default.join(finalDir, `${upload._id}-${upload.fileName}`);
        const targetStream = (0, fs_2.createWriteStream)(finalFilePath);
        try {
            for (let index = 0; index < upload.totalChunks; index += 1) {
                const chunkPath = path_1.default.join(upload.tempDir, `${index}.chunk`);
                if (!fs_1.default.existsSync(chunkPath)) {
                    throw new httpError_1.HttpError(400, `Missing chunk ${index}`);
                }
                await (0, promises_1.pipeline)((0, fs_2.createReadStream)(chunkPath), targetStream, { end: false });
            }
            targetStream.end();
            upload.status = "completed";
            upload.storagePath = finalFilePath;
            upload.errorMessage = "";
            await upload.save();
            await this.cleanupTempDirectory(upload.tempDir);
            await logService_1.LogService.createLog({
                actionType: "UPLOAD_COMPLETED",
                userId: params.userId,
                projectId: upload.project ? String(upload.project) : undefined,
                details: {
                    uploadId: String(upload._id),
                    storagePath: finalFilePath,
                },
            });
            return upload;
        }
        catch (error) {
            upload.status = "failed";
            upload.errorMessage = error?.message ?? "Upload merge failed";
            await upload.save();
            await logService_1.LogService.createLog({
                actionType: "UPLOAD_FAILED",
                userId: params.userId,
                projectId: upload.project ? String(upload.project) : undefined,
                success: false,
                errorMessage: upload.errorMessage,
                details: {
                    uploadId: String(upload._id),
                },
            });
            throw error;
        }
    }
    static async getUploadStatus(uploadId, userId) {
        const upload = await models_1.UploadModel.findById(uploadId);
        if (!upload) {
            throw new httpError_1.HttpError(404, "Upload session not found");
        }
        if (String(upload.user) !== userId) {
            throw new httpError_1.HttpError(403, "Upload does not belong to the authenticated user");
        }
        return {
            upload,
            progressPercent: upload.totalChunks > 0
                ? Math.round((upload.uploadedChunksCount / upload.totalChunks) * 100)
                : 0,
        };
    }
    static async cancelUpload(uploadId, userId) {
        const upload = await models_1.UploadModel.findById(uploadId);
        if (!upload) {
            throw new httpError_1.HttpError(404, "Upload session not found");
        }
        if (String(upload.user) !== userId) {
            throw new httpError_1.HttpError(403, "Upload does not belong to the authenticated user");
        }
        upload.status = "canceled";
        upload.errorMessage = "Upload canceled by user";
        await upload.save();
        await this.cleanupTempDirectory(upload.tempDir);
        return upload;
    }
    static async cleanupTempDirectory(tempDir) {
        try {
            await fs_3.promises.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            console.error("Failed to cleanup temp directory", tempDir, error);
        }
    }
    static async cleanupExpiredUploadArtifacts() {
        const expiredUploads = await models_1.UploadModel.find({
            status: { $in: ["failed", "canceled"] },
            updatedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });
        for (const upload of expiredUploads) {
            await this.cleanupTempDirectory(upload.tempDir);
        }
    }
}
exports.UploadService = UploadService;
