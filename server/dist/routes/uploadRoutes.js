"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const express_validator_1 = require("express-validator");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const uploadService_1 = require("../services/uploadService");
const uploadRoutes = (0, express_1.Router)();
exports.uploadRoutes = uploadRoutes;
const uploadMiddleware = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
uploadRoutes.post("/initiate", authMiddleware_1.requireAuth, [
    (0, express_validator_1.body)("fileName").isString().notEmpty(),
    (0, express_validator_1.body)("fileSize").isNumeric(),
    (0, express_validator_1.body)("mimeType").isString().notEmpty(),
    (0, express_validator_1.body)("projectId").optional().isString(),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const upload = await uploadService_1.UploadService.initiateUpload({
            userId: String(req.user?._id),
            projectId: req.body.projectId,
            fileName: req.body.fileName,
            fileSize: Number(req.body.fileSize),
            mimeType: req.body.mimeType,
            checksum: req.body.checksum,
        });
        return res.status(201).json(upload);
    }
    catch (error) {
        return next(error);
    }
});
uploadRoutes.post("/chunk", authMiddleware_1.requireAuth, uploadMiddleware.single("chunk"), [(0, express_validator_1.body)("uploadId").isString().notEmpty(), (0, express_validator_1.body)("chunkIndex").isInt({ min: 0 })], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ message: "Chunk binary is required" });
        }
        const upload = await uploadService_1.UploadService.uploadChunk({
            uploadId: req.body.uploadId,
            userId: String(req.user?._id),
            chunkIndex: Number(req.body.chunkIndex),
            chunkData: req.file.buffer,
        });
        return res.status(200).json(upload);
    }
    catch (error) {
        return next(error);
    }
});
uploadRoutes.post("/complete", authMiddleware_1.requireAuth, [(0, express_validator_1.body)("uploadId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const upload = await uploadService_1.UploadService.completeUpload({
            uploadId: req.body.uploadId,
            userId: String(req.user?._id),
        });
        return res.status(200).json(upload);
    }
    catch (error) {
        return next(error);
    }
});
uploadRoutes.get("/:uploadId/status", authMiddleware_1.requireAuth, [(0, express_validator_1.param)("uploadId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const status = await uploadService_1.UploadService.getUploadStatus(req.params.uploadId, String(req.user?._id));
        return res.status(200).json(status);
    }
    catch (error) {
        return next(error);
    }
});
uploadRoutes.delete("/:uploadId", authMiddleware_1.requireAuth, [(0, express_validator_1.param)("uploadId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const upload = await uploadService_1.UploadService.cancelUpload(req.params.uploadId, String(req.user?._id));
        return res.status(200).json(upload);
    }
    catch (error) {
        return next(error);
    }
});
