"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const mongoose_1 = require("mongoose");
const authMiddleware_1 = require("../middleware/authMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const authService_1 = require("../services/authService");
const githubService_1 = require("../services/githubService");
const projectService_1 = require("../services/projectService");
const models_1 = require("../models");
const language_1 = require("../utils/language");
const logService_1 = require("../services/logService");
const githubRoutes = (0, express_1.Router)();
exports.githubRoutes = githubRoutes;
githubRoutes.get("/auth-url", [(0, express_validator_1.query)("state").optional().isString()], validationMiddleware_1.validateRequest, (req, res) => {
    const state = req.query.state || new mongoose_1.Types.ObjectId().toString();
    const authUrl = githubService_1.GitHubService.getAuthorizationUrl(state);
    return res.status(200).json({ authUrl, state });
});
githubRoutes.post("/callback", [(0, express_validator_1.body)("code").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const { code } = req.body;
        const tokenResponse = await githubService_1.GitHubService.exchangeCodeForToken(code);
        const profile = await githubService_1.GitHubService.getUserProfile(tokenResponse.accessToken);
        const auth = await authService_1.AuthService.upsertGitHubUser({
            githubId: profile.id,
            githubUsername: profile.login,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
            profileUrl: profile.profileUrl,
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            tokenExpiresAt: tokenResponse.expiresIn
                ? new Date(Date.now() + tokenResponse.expiresIn * 1000)
                : undefined,
        });
        return res.status(200).json(auth);
    }
    catch (error) {
        return next(error);
    }
});
githubRoutes.get("/repositories", authMiddleware_1.requireAuth, [(0, express_validator_1.query)("page").optional().isInt({ min: 1 }), (0, express_validator_1.query)("perPage").optional().isInt({ min: 1, max: 100 })], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 1);
        const perPage = Number(req.query.perPage ?? 20);
        const repositories = await githubService_1.GitHubService.listRepositories(String(req.user?._id), page, perPage);
        return res.status(200).json(repositories);
    }
    catch (error) {
        return next(error);
    }
});
githubRoutes.post("/import-repository", authMiddleware_1.requireAuth, [
    (0, express_validator_1.body)("owner").isString().notEmpty(),
    (0, express_validator_1.body)("repo").isString().notEmpty(),
    (0, express_validator_1.body)("branch").optional().isString(),
    (0, express_validator_1.body)("projectId").optional().isString(),
    (0, express_validator_1.body)("createNewProject").optional().isBoolean(),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const { owner, repo, branch, projectId, createNewProject } = req.body;
        const imported = await githubService_1.GitHubService.importRepository({
            userId: String(req.user?._id),
            owner,
            repo,
            branch,
        });
        let targetProjectId = projectId;
        if (!targetProjectId || createNewProject) {
            const project = await projectService_1.ProjectService.createProject({
                userId: String(req.user?._id),
                name: repo,
                description: `Imported from ${owner}/${repo}`,
                tags: ["github", "imported"],
                visibility: "private",
            });
            targetProjectId = String(project._id);
        }
        const directorySet = new Set();
        for (const file of imported.files) {
            const parts = file.path.split("/");
            for (let index = 1; index < parts.length; index += 1) {
                directorySet.add(parts.slice(0, index).join("/"));
            }
        }
        const directories = Array.from(directorySet).sort((a, b) => a.length - b.length);
        const pathToId = new Map();
        for (const directoryPath of directories) {
            const name = directoryPath.split("/").pop() ?? directoryPath;
            const parentPath = directoryPath.includes("/")
                ? directoryPath.slice(0, directoryPath.lastIndexOf("/"))
                : "";
            const existing = await models_1.FileModel.findOne({
                project: targetProjectId,
                path: directoryPath,
            });
            if (existing) {
                pathToId.set(directoryPath, String(existing._id));
                continue;
            }
            const createdDirectory = await models_1.FileModel.create({
                project: targetProjectId,
                parentDirectory: parentPath ? pathToId.get(parentPath) ?? null : null,
                name,
                path: directoryPath,
                isDirectory: true,
                content: "",
                language: "plaintext",
                sizeBytes: 0,
                createdBy: req.user?._id,
                lastModifiedBy: req.user?._id,
            });
            pathToId.set(directoryPath, String(createdDirectory._id));
        }
        for (const file of imported.files) {
            const name = file.path.split("/").pop() ?? file.path;
            const parentPath = file.path.includes("/")
                ? file.path.slice(0, file.path.lastIndexOf("/"))
                : "";
            await models_1.FileModel.findOneAndUpdate({ project: targetProjectId, path: file.path }, {
                $set: {
                    parentDirectory: parentPath ? pathToId.get(parentPath) ?? null : null,
                    name,
                    path: file.path,
                    isDirectory: false,
                    content: file.content,
                    language: (0, language_1.detectLanguageFromFileName)(name),
                    sizeBytes: file.size,
                    lastModifiedBy: req.user?._id,
                },
                $setOnInsert: {
                    project: targetProjectId,
                    createdBy: req.user?._id,
                    version: 1,
                    versions: [
                        {
                            version: 1,
                            content: file.content,
                            modifiedBy: req.user?._id,
                            modifiedAt: new Date(),
                            message: "Imported from GitHub",
                        },
                    ],
                },
            }, {
                upsert: true,
                new: true,
            });
        }
        await models_1.ProjectModel.findByIdAndUpdate(targetProjectId, {
            github: {
                repoOwner: owner,
                repoName: repo,
                repoUrl: `https://github.com/${owner}/${repo}`,
                defaultBranch: imported.branch,
                lastSyncAt: new Date(),
            },
        });
        await projectService_1.ProjectService.refreshProjectStats(targetProjectId);
        await logService_1.LogService.createLog({
            actionType: "GITHUB_IMPORT",
            userId: req.user?._id,
            projectId: targetProjectId,
            details: {
                owner,
                repo,
                branch: imported.branch,
                fileCount: imported.files.length,
            },
        });
        return res.status(200).json({
            projectId: targetProjectId,
            imported,
        });
    }
    catch (error) {
        return next(error);
    }
});
githubRoutes.post("/push-to-github", authMiddleware_1.requireAuth, [
    (0, express_validator_1.body)("owner").isString().notEmpty(),
    (0, express_validator_1.body)("repo").isString().notEmpty(),
    (0, express_validator_1.body)("branch").isString().notEmpty(),
    (0, express_validator_1.body)("message").isString().notEmpty(),
    (0, express_validator_1.body)("projectId").optional().isString(),
    (0, express_validator_1.body)("files").optional().isArray(),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const { owner, repo, branch, message, projectId, files, } = req.body;
        const payloadFiles = files?.length
            ? files
            : projectId
                ? (await models_1.FileModel.find({
                    project: projectId,
                    isDirectory: false,
                }).lean()).map((file) => ({ path: file.path, content: file.content }))
                : [];
        const pushResult = await githubService_1.GitHubService.pushCode(String(req.user?._id), {
            owner,
            repo,
            branch,
            message,
            files: payloadFiles,
        });
        await logService_1.LogService.createLog({
            actionType: "GITHUB_PUSH",
            userId: req.user?._id,
            projectId,
            success: !pushResult.hasConflicts,
            details: {
                owner,
                repo,
                branch,
                committed: pushResult.committed.length,
                conflicts: pushResult.conflicts,
            },
        });
        return res.status(200).json(pushResult);
    }
    catch (error) {
        return next(error);
    }
});
githubRoutes.get("/branches/:owner/:repo", authMiddleware_1.requireAuth, [(0, express_validator_1.param)("owner").isString().notEmpty(), (0, express_validator_1.param)("repo").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const branches = await githubService_1.GitHubService.getBranches(String(req.user?._id), req.params.owner, req.params.repo);
        return res.status(200).json(branches);
    }
    catch (error) {
        return next(error);
    }
});
