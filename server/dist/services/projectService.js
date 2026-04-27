"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const path_1 = __importDefault(require("path"));
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const language_1 = require("../utils/language");
const httpError_1 = require("../utils/httpError");
class ProjectService {
    static async createProject(params) {
        const project = await models_1.ProjectModel.create({
            name: params.name,
            description: params.description ?? "",
            tags: params.tags ?? [],
            owner: params.userId,
            visibility: params.visibility ?? "private",
            collaborators: [
                {
                    user: params.userId,
                    role: "owner",
                },
            ],
        });
        return project;
    }
    static async listProjectsForUser(userId, search) {
        const query = {
            $or: [{ owner: userId }, { "collaborators.user": userId }],
            isArchived: false,
        };
        if (search && search.trim()) {
            query.$and = [
                {
                    $or: [
                        { name: { $regex: search, $options: "i" } },
                        { description: { $regex: search, $options: "i" } },
                    ],
                },
            ];
        }
        return models_1.ProjectModel.find(query)
            .sort({ updatedAt: -1 })
            .populate("owner", "profile.username profile.avatar")
            .lean();
    }
    static async getProjectForUser(projectId, userId) {
        const project = await models_1.ProjectModel.findById(projectId)
            .populate("owner", "profile.username profile.avatar")
            .populate("collaborators.user", "profile.username profile.avatar email");
        if (!project) {
            throw new httpError_1.HttpError(404, "Project not found");
        }
        const hasAccess = String(project.owner) === userId ||
            project.collaborators.some((item) => String(item.user) === userId) ||
            project.visibility !== "private";
        if (!hasAccess) {
            throw new httpError_1.HttpError(403, "You do not have access to this project");
        }
        return project;
    }
    static async updateProject(projectId, updates) {
        const project = await models_1.ProjectModel.findByIdAndUpdate(projectId, updates, {
            new: true,
        });
        if (!project) {
            throw new httpError_1.HttpError(404, "Project not found");
        }
        return project;
    }
    static async deleteProject(projectId) {
        await Promise.all([
            models_1.FileModel.deleteMany({ project: projectId }),
            models_1.TestCaseModel.deleteMany({ project: projectId }),
            models_1.ProjectModel.findByIdAndDelete(projectId),
        ]);
    }
    static async archiveProject(projectId) {
        const project = await models_1.ProjectModel.findByIdAndUpdate(projectId, {
            isArchived: true,
            archivedAt: new Date(),
        }, { new: true });
        if (!project) {
            throw new httpError_1.HttpError(404, "Project not found");
        }
        return project;
    }
    static async inviteCollaborator(projectId, collaboratorUserId, role, invitedBy) {
        const project = await models_1.ProjectModel.findById(projectId);
        if (!project) {
            throw new httpError_1.HttpError(404, "Project not found");
        }
        const exists = project.collaborators.some((collaborator) => String(collaborator.user) === collaboratorUserId);
        if (exists) {
            throw new httpError_1.HttpError(409, "Collaborator already added");
        }
        project.collaborators.push({
            user: new mongoose_1.Types.ObjectId(collaboratorUserId),
            role: role,
            invitedBy: new mongoose_1.Types.ObjectId(invitedBy),
            invitedAt: new Date(),
        });
        await project.save();
        return project;
    }
    static async removeCollaborator(projectId, collaboratorUserId) {
        const project = await models_1.ProjectModel.findById(projectId);
        if (!project) {
            throw new httpError_1.HttpError(404, "Project not found");
        }
        const nextCollaborators = project.collaborators.filter((collaborator) => String(collaborator.user) !== collaboratorUserId);
        project.set("collaborators", nextCollaborators);
        await project.save();
        return project;
    }
    static async changeCollaboratorRole(projectId, collaboratorUserId, role) {
        const project = await models_1.ProjectModel.findById(projectId);
        if (!project) {
            throw new httpError_1.HttpError(404, "Project not found");
        }
        const collaborator = project.collaborators.find((item) => String(item.user) === collaboratorUserId);
        if (!collaborator) {
            throw new httpError_1.HttpError(404, "Collaborator not found");
        }
        collaborator.role = role;
        await project.save();
        return project;
    }
    static async createFile(params) {
        const parentDirectory = params.parentDirectory ?? null;
        const parentPath = parentDirectory
            ? await models_1.FileModel.findById(parentDirectory).then((parent) => parent?.path ?? "")
            : "";
        const filePath = path_1.default.posix.join(parentPath, params.name);
        const file = await models_1.FileModel.create({
            project: params.projectId,
            parentDirectory,
            name: params.name,
            path: filePath,
            isDirectory: Boolean(params.isDirectory),
            content: params.isDirectory ? "" : params.content ?? "",
            language: params.isDirectory ? "plaintext" : (0, language_1.detectLanguageFromFileName)(params.name),
            sizeBytes: params.isDirectory ? 0 : Buffer.byteLength(params.content ?? "", "utf8"),
            createdBy: params.userId,
            lastModifiedBy: params.userId,
            versions: params.isDirectory
                ? []
                : [
                    {
                        version: 1,
                        content: params.content ?? "",
                        modifiedBy: params.userId,
                        modifiedAt: new Date(),
                        message: "Initial version",
                    },
                ],
        });
        await this.refreshProjectStats(params.projectId);
        return file;
    }
    static async getProjectFiles(projectId) {
        return models_1.FileModel.find({ project: projectId }).sort({ isDirectory: -1, name: 1 }).lean();
    }
    static async updateFile(params) {
        const file = await models_1.FileModel.findById(params.fileId);
        if (!file) {
            throw new httpError_1.HttpError(404, "File not found");
        }
        if (typeof params.name === "string" && params.name.trim()) {
            file.name = params.name.trim();
            file.language = (0, language_1.detectLanguageFromFileName)(file.name);
            if (file.parentDirectory) {
                const parent = await models_1.FileModel.findById(file.parentDirectory);
                file.path = path_1.default.posix.join(parent?.path ?? "", file.name);
            }
            else {
                file.path = file.name;
            }
        }
        if (typeof params.content === "string" && !file.isDirectory) {
            file.content = params.content;
            file.sizeBytes = Buffer.byteLength(params.content, "utf8");
            file.version += 1;
            file.versions.push({
                version: file.version,
                content: params.content,
                modifiedBy: new mongoose_1.Types.ObjectId(params.userId),
                modifiedAt: new Date(),
                message: "Updated content",
            });
        }
        file.lastModifiedBy = new mongoose_1.Types.ObjectId(params.userId);
        await file.save();
        await this.refreshProjectStats(String(file.project));
        return file;
    }
    static async deleteFile(fileId) {
        const file = await models_1.FileModel.findById(fileId);
        if (!file) {
            throw new httpError_1.HttpError(404, "File not found");
        }
        await models_1.FileModel.deleteOne({ _id: fileId });
        if (file.isDirectory) {
            await models_1.FileModel.deleteMany({
                project: file.project,
                path: { $regex: `^${file.path}/` },
            });
        }
        await this.refreshProjectStats(String(file.project));
    }
    static async getFileVersions(fileId) {
        const file = await models_1.FileModel.findById(fileId).lean();
        if (!file) {
            throw new httpError_1.HttpError(404, "File not found");
        }
        return file.versions;
    }
    static async createTestCase(params) {
        return models_1.TestCaseModel.create({
            project: params.projectId,
            name: params.name,
            language: params.language,
            input: params.input,
            expectedOutput: params.expectedOutput,
            hidden: params.hidden ?? false,
            createdBy: params.userId,
            updatedBy: params.userId,
        });
    }
    static async listTestCases(projectId, language) {
        const query = { project: projectId };
        if (language) {
            query.language = language;
        }
        return models_1.TestCaseModel.find(query).sort({ createdAt: -1 }).lean();
    }
    static async updateTestCase(testId, updates, userId) {
        const test = await models_1.TestCaseModel.findByIdAndUpdate(testId, {
            ...updates,
            updatedBy: userId,
        }, { new: true });
        if (!test) {
            throw new httpError_1.HttpError(404, "Test case not found");
        }
        return test;
    }
    static async deleteTestCase(testId) {
        const deleted = await models_1.TestCaseModel.findByIdAndDelete(testId);
        if (!deleted) {
            throw new httpError_1.HttpError(404, "Test case not found");
        }
    }
    static async refreshProjectStats(projectId) {
        const [aggregate] = await models_1.FileModel.aggregate([
            {
                $match: {
                    project: new mongoose_1.Types.ObjectId(projectId),
                    isDirectory: false,
                },
            },
            {
                $group: {
                    _id: "$project",
                    fileCount: { $sum: 1 },
                    totalSizeBytes: { $sum: "$sizeBytes" },
                    lastModifiedAt: { $max: "$updatedAt" },
                },
            },
        ]);
        await models_1.ProjectModel.findByIdAndUpdate(projectId, {
            statistics: {
                fileCount: aggregate?.fileCount ?? 0,
                totalSizeBytes: aggregate?.totalSizeBytes ?? 0,
                lastModifiedAt: aggregate?.lastModifiedAt ?? new Date(),
            },
        });
    }
}
exports.ProjectService = ProjectService;
