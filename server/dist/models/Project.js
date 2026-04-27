"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectModel = void 0;
const mongoose_1 = require("mongoose");
const collaboratorSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    role: {
        type: String,
        enum: ["owner", "editor", "viewer", "commenter"],
        required: true,
    },
    invitedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    invitedAt: {
        type: Date,
        default: () => new Date(),
    },
}, { _id: false });
const projectSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    description: {
        type: String,
        default: "",
        maxlength: 1000,
    },
    tags: {
        type: [String],
        default: [],
    },
    owner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    collaborators: {
        type: [collaboratorSchema],
        default: [],
    },
    github: {
        repoOwner: { type: String },
        repoName: { type: String },
        repoUrl: { type: String },
        defaultBranch: { type: String, default: "main" },
        lastSyncAt: { type: Date },
        installationId: { type: String },
    },
    visibility: {
        type: String,
        enum: ["private", "link", "public"],
        default: "private",
        index: true,
    },
    archivedAt: { type: Date },
    isArchived: { type: Boolean, default: false, index: true },
    statistics: {
        fileCount: { type: Number, default: 0 },
        totalSizeBytes: { type: Number, default: 0 },
        lastModifiedAt: { type: Date, default: () => new Date() },
    },
}, {
    timestamps: true,
    versionKey: false,
});
projectSchema.index({ owner: 1, updatedAt: -1 });
projectSchema.index({ "collaborators.user": 1, updatedAt: -1 });
projectSchema.index({ visibility: 1, isArchived: 1, updatedAt: -1 });
projectSchema.index({ tags: 1 });
projectSchema.methods.hasUserAccess = function (userId) {
    const normalizedUserId = String(userId);
    if (String(this.owner) === normalizedUserId) {
        return true;
    }
    return this.collaborators.some((collaborator) => {
        return String(collaborator.user) === normalizedUserId;
    });
};
const ProjectModel = (0, mongoose_1.model)("Project", projectSchema);
exports.ProjectModel = ProjectModel;
