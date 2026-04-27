"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rbacMiddleware_1 = require("../middleware/rbacMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const projectService_1 = require("../services/projectService");
const logService_1 = require("../services/logService");
const projectRoutes = (0, express_1.Router)();
exports.projectRoutes = projectRoutes;
projectRoutes.post("/create", authMiddleware_1.requireAuth, [(0, express_validator_1.body)("name").isString().notEmpty(), (0, express_validator_1.body)("description").optional().isString()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const project = await projectService_1.ProjectService.createProject({
            userId: String(req.user?._id),
            name: req.body.name,
            description: req.body.description,
            tags: req.body.tags,
            visibility: req.body.visibility,
        });
        await logService_1.LogService.createLog({
            actionType: "PROJECT_CREATED",
            userId: req.user?._id,
            projectId: String(project._id),
            details: {
                name: project.name,
            },
        });
        return res.status(201).json(project);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.get("/", authMiddleware_1.requireAuth, [(0, express_validator_1.query)("search").optional().isString()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const projects = await projectService_1.ProjectService.listProjectsForUser(String(req.user?._id), req.query.search);
        return res.status(200).json(projects);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.get("/:projectId", authMiddleware_1.requireAuth, [(0, express_validator_1.param)("projectId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const project = await projectService_1.ProjectService.getProjectForUser(req.params.projectId, String(req.user?._id));
        return res.status(200).json(project);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.put("/:projectId", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["owner"]), [(0, express_validator_1.param)("projectId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const project = await projectService_1.ProjectService.updateProject(req.params.projectId, req.body);
        await logService_1.LogService.createLog({
            actionType: "PROJECT_UPDATED",
            userId: req.user?._id,
            projectId: req.params.projectId,
        });
        return res.status(200).json(project);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.delete("/:projectId", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["owner"]), [(0, express_validator_1.param)("projectId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        await projectService_1.ProjectService.deleteProject(req.params.projectId);
        await logService_1.LogService.createLog({
            actionType: "PROJECT_DELETED",
            userId: req.user?._id,
            projectId: req.params.projectId,
        });
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.post("/:projectId/archive", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["owner"]), [(0, express_validator_1.param)("projectId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const project = await projectService_1.ProjectService.archiveProject(req.params.projectId);
        await logService_1.LogService.createLog({
            actionType: "PROJECT_ARCHIVED",
            userId: req.user?._id,
            projectId: req.params.projectId,
        });
        return res.status(200).json(project);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.post("/:projectId/invite", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["owner"]), [
    (0, express_validator_1.param)("projectId").isString().notEmpty(),
    (0, express_validator_1.body)("userId").isString().notEmpty(),
    (0, express_validator_1.body)("role").isIn(["owner", "editor", "viewer", "commenter"]),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const project = await projectService_1.ProjectService.inviteCollaborator(req.params.projectId, req.body.userId, req.body.role, String(req.user?._id));
        await logService_1.LogService.createLog({
            actionType: "COLLABORATOR_INVITED",
            userId: req.user?._id,
            projectId: req.params.projectId,
            details: {
                invitedUserId: req.body.userId,
                role: req.body.role,
            },
        });
        return res.status(200).json(project);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.delete("/:projectId/collaborators/:userId", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["owner"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.param)("userId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const project = await projectService_1.ProjectService.removeCollaborator(req.params.projectId, req.params.userId);
        await logService_1.LogService.createLog({
            actionType: "COLLABORATOR_REMOVED",
            userId: req.user?._id,
            projectId: req.params.projectId,
            details: {
                removedUserId: req.params.userId,
            },
        });
        return res.status(200).json(project);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.put("/:projectId/collaborators/:userId/role", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["owner"]), [
    (0, express_validator_1.param)("projectId").isString().notEmpty(),
    (0, express_validator_1.param)("userId").isString().notEmpty(),
    (0, express_validator_1.body)("role").isIn(["owner", "editor", "viewer", "commenter"]),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const project = await projectService_1.ProjectService.changeCollaboratorRole(req.params.projectId, req.params.userId, req.body.role);
        await logService_1.LogService.createLog({
            actionType: "COLLABORATOR_ROLE_CHANGED",
            userId: req.user?._id,
            projectId: req.params.projectId,
            details: {
                userId: req.params.userId,
                role: req.body.role,
            },
        });
        return res.status(200).json(project);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.get("/:projectId/collaborators", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [(0, express_validator_1.param)("projectId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const project = await projectService_1.ProjectService.getProjectForUser(req.params.projectId, String(req.user?._id));
        return res.status(200).json(project.collaborators);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.post("/:projectId/files", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["editor"]), [
    (0, express_validator_1.param)("projectId").isString().notEmpty(),
    (0, express_validator_1.body)("name").isString().notEmpty(),
    (0, express_validator_1.body)("isDirectory").optional().isBoolean(),
    (0, express_validator_1.body)("parentDirectory").optional({ nullable: true }).isString(),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const file = await projectService_1.ProjectService.createFile({
            projectId: req.params.projectId,
            name: req.body.name,
            isDirectory: req.body.isDirectory,
            parentDirectory: req.body.parentDirectory,
            content: req.body.content,
            userId: String(req.user?._id),
        });
        await logService_1.LogService.createLog({
            actionType: "FILE_CREATED",
            userId: req.user?._id,
            projectId: req.params.projectId,
            fileId: String(file._id),
        });
        return res.status(201).json(file);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.get("/:projectId/files", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [(0, express_validator_1.param)("projectId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const files = await projectService_1.ProjectService.getProjectFiles(req.params.projectId);
        return res.status(200).json(files);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.put("/:projectId/files/:fileId", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["editor"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.param)("fileId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const file = await projectService_1.ProjectService.updateFile({
            fileId: req.params.fileId,
            content: req.body.content,
            name: req.body.name,
            userId: String(req.user?._id),
        });
        await logService_1.LogService.createLog({
            actionType: "FILE_UPDATED",
            userId: req.user?._id,
            projectId: req.params.projectId,
            fileId: req.params.fileId,
        });
        return res.status(200).json(file);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.delete("/:projectId/files/:fileId", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["editor"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.param)("fileId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        await projectService_1.ProjectService.deleteFile(req.params.fileId);
        await logService_1.LogService.createLog({
            actionType: "FILE_DELETED",
            userId: req.user?._id,
            projectId: req.params.projectId,
            fileId: req.params.fileId,
        });
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.get("/:projectId/files/:fileId/versions", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.param)("fileId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const versions = await projectService_1.ProjectService.getFileVersions(req.params.fileId);
        return res.status(200).json(versions);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.post("/:projectId/tests", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["editor"]), [
    (0, express_validator_1.param)("projectId").isString().notEmpty(),
    (0, express_validator_1.body)("name").isString().notEmpty(),
    (0, express_validator_1.body)("language").isString().notEmpty(),
    (0, express_validator_1.body)("expectedOutput").isString(),
    (0, express_validator_1.body)("input").optional().isString(),
    (0, express_validator_1.body)("hidden").optional().isBoolean(),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const testCase = await projectService_1.ProjectService.createTestCase({
            projectId: req.params.projectId,
            name: req.body.name,
            language: req.body.language,
            input: req.body.input ?? "",
            expectedOutput: req.body.expectedOutput,
            hidden: req.body.hidden,
            userId: String(req.user?._id),
        });
        return res.status(201).json(testCase);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.get("/:projectId/tests", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.query)("language").optional().isString()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const tests = await projectService_1.ProjectService.listTestCases(req.params.projectId, req.query.language);
        return res.status(200).json(tests);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.put("/:projectId/tests/:testId", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["editor"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.param)("testId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const test = await projectService_1.ProjectService.updateTestCase(req.params.testId, req.body, String(req.user?._id));
        return res.status(200).json(test);
    }
    catch (error) {
        return next(error);
    }
});
projectRoutes.delete("/:projectId/tests/:testId", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["editor"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.param)("testId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        await projectService_1.ProjectService.deleteTestCase(req.params.testId);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
