"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_TYPES = exports.LogModel = void 0;
const mongoose_1 = require("mongoose");
const ACTION_TYPES = [
    "FILE_CREATED",
    "FILE_UPDATED",
    "FILE_DELETED",
    "FILE_RENAMED",
    "DIRECTORY_CREATED",
    "DIRECTORY_UPDATED",
    "DIRECTORY_DELETED",
    "DIRECTORY_RENAMED",
    "PROJECT_CREATED",
    "PROJECT_UPDATED",
    "PROJECT_ARCHIVED",
    "PROJECT_DELETED",
    "COLLABORATOR_INVITED",
    "COLLABORATOR_REMOVED",
    "COLLABORATOR_ROLE_CHANGED",
    "CODE_EXECUTED",
    "CODE_EVALUATED",
    "UPLOAD_INITIATED",
    "UPLOAD_CHUNK",
    "UPLOAD_COMPLETED",
    "UPLOAD_FAILED",
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
    "GITHUB_CONNECTED",
    "GITHUB_IMPORT",
    "GITHUB_PUSH",
    "ERROR",
    "REQUEST",
];
exports.ACTION_TYPES = ACTION_TYPES;
const logSchema = new mongoose_1.Schema({
    actionType: {
        type: String,
        enum: ACTION_TYPES,
        required: true,
        index: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    project: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Project",
        index: true,
    },
    file: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "File",
    },
    session: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Session",
    },
    details: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    ipAddress: {
        type: String,
        default: "",
    },
    userAgent: {
        type: String,
        default: "",
    },
    requestId: {
        type: String,
        index: true,
    },
    statusCode: {
        type: Number,
    },
    durationMs: {
        type: Number,
    },
    success: {
        type: Boolean,
        default: true,
        index: true,
    },
    errorMessage: {
        type: String,
        default: "",
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
}, {
    timestamps: true,
    versionKey: false,
});
logSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
logSchema.index({ project: 1, createdAt: -1 });
logSchema.index({ user: 1, createdAt: -1 });
logSchema.index({ actionType: 1, createdAt: -1 });
const LogModel = (0, mongoose_1.model)("Log", logSchema);
exports.LogModel = LogModel;
