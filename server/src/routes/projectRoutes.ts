import { Router } from "express"
import { body, param, query } from "express-validator"
import { requireAuth } from "../middleware/authMiddleware"
import { requireProjectRole } from "../middleware/rbacMiddleware"
import { validateRequest } from "../middleware/validationMiddleware"
import { ProjectService } from "../services/projectService"
import { LogService } from "../services/logService"

const projectRoutes = Router()

projectRoutes.post(
  "/create",
  requireAuth,
  [body("name").isString().notEmpty(), body("description").optional().isString()],
  validateRequest,
  async (req, res, next) => {
    try {
      const project = await ProjectService.createProject({
        userId: String(req.user?._id),
        name: req.body.name,
        description: req.body.description,
        tags: req.body.tags,
        visibility: req.body.visibility,
      })

      await LogService.createLog({
        actionType: "PROJECT_CREATED",
        userId: req.user?._id,
        projectId: String(project._id),
        details: {
          name: project.name,
        },
      })

      return res.status(201).json(project)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.get("/", requireAuth, [query("search").optional().isString()], validateRequest, async (req, res, next) => {
  try {
    const projects = await ProjectService.listProjectsForUser(String(req.user?._id), req.query.search as string)
    return res.status(200).json(projects)
  } catch (error) {
    return next(error)
  }
})

projectRoutes.get(
  "/:projectId",
  requireAuth,
  [param("projectId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const project = await ProjectService.getProjectForUser(req.params.projectId, String(req.user?._id))
      return res.status(200).json(project)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.put(
  "/:projectId",
  requireAuth,
  requireProjectRole(["owner"]),
  [param("projectId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const project = await ProjectService.updateProject(req.params.projectId, req.body)

      await LogService.createLog({
        actionType: "PROJECT_UPDATED",
        userId: req.user?._id,
        projectId: req.params.projectId,
      })

      return res.status(200).json(project)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.delete(
  "/:projectId",
  requireAuth,
  requireProjectRole(["owner"]),
  [param("projectId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      await ProjectService.deleteProject(req.params.projectId)

      await LogService.createLog({
        actionType: "PROJECT_DELETED",
        userId: req.user?._id,
        projectId: req.params.projectId,
      })

      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.post(
  "/:projectId/archive",
  requireAuth,
  requireProjectRole(["owner"]),
  [param("projectId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const project = await ProjectService.archiveProject(req.params.projectId)

      await LogService.createLog({
        actionType: "PROJECT_ARCHIVED",
        userId: req.user?._id,
        projectId: req.params.projectId,
      })

      return res.status(200).json(project)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.post(
  "/:projectId/invite",
  requireAuth,
  requireProjectRole(["owner"]),
  [
    param("projectId").isString().notEmpty(),
    body("userId").isString().notEmpty(),
    body("role").isIn(["owner", "editor", "viewer", "commenter"]),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const project = await ProjectService.inviteCollaborator(
        req.params.projectId,
        req.body.userId,
        req.body.role,
        String(req.user?._id)
      )

      await LogService.createLog({
        actionType: "COLLABORATOR_INVITED",
        userId: req.user?._id,
        projectId: req.params.projectId,
        details: {
          invitedUserId: req.body.userId,
          role: req.body.role,
        },
      })

      return res.status(200).json(project)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.delete(
  "/:projectId/collaborators/:userId",
  requireAuth,
  requireProjectRole(["owner"]),
  [param("projectId").isString().notEmpty(), param("userId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const project = await ProjectService.removeCollaborator(req.params.projectId, req.params.userId)

      await LogService.createLog({
        actionType: "COLLABORATOR_REMOVED",
        userId: req.user?._id,
        projectId: req.params.projectId,
        details: {
          removedUserId: req.params.userId,
        },
      })

      return res.status(200).json(project)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.put(
  "/:projectId/collaborators/:userId/role",
  requireAuth,
  requireProjectRole(["owner"]),
  [
    param("projectId").isString().notEmpty(),
    param("userId").isString().notEmpty(),
    body("role").isIn(["owner", "editor", "viewer", "commenter"]),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const project = await ProjectService.changeCollaboratorRole(
        req.params.projectId,
        req.params.userId,
        req.body.role
      )

      await LogService.createLog({
        actionType: "COLLABORATOR_ROLE_CHANGED",
        userId: req.user?._id,
        projectId: req.params.projectId,
        details: {
          userId: req.params.userId,
          role: req.body.role,
        },
      })

      return res.status(200).json(project)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.get(
  "/:projectId/collaborators",
  requireAuth,
  requireProjectRole(["viewer"]),
  [param("projectId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const project = await ProjectService.getProjectForUser(req.params.projectId, String(req.user?._id))
      return res.status(200).json(project.collaborators)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.post(
  "/:projectId/files",
  requireAuth,
  requireProjectRole(["editor"]),
  [
    param("projectId").isString().notEmpty(),
    body("name").isString().notEmpty(),
    body("isDirectory").optional().isBoolean(),
    body("parentDirectory").optional({ nullable: true }).isString(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const file = await ProjectService.createFile({
        projectId: req.params.projectId,
        name: req.body.name,
        isDirectory: req.body.isDirectory,
        parentDirectory: req.body.parentDirectory,
        content: req.body.content,
        userId: String(req.user?._id),
      })

      await LogService.createLog({
        actionType: "FILE_CREATED",
        userId: req.user?._id,
        projectId: req.params.projectId,
        fileId: String(file._id),
      })

      return res.status(201).json(file)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.get(
  "/:projectId/files",
  requireAuth,
  requireProjectRole(["viewer"]),
  [param("projectId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const files = await ProjectService.getProjectFiles(req.params.projectId)
      return res.status(200).json(files)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.put(
  "/:projectId/files/:fileId",
  requireAuth,
  requireProjectRole(["editor"]),
  [param("projectId").isString().notEmpty(), param("fileId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const file = await ProjectService.updateFile({
        fileId: req.params.fileId,
        content: req.body.content,
        name: req.body.name,
        userId: String(req.user?._id),
      })

      await LogService.createLog({
        actionType: "FILE_UPDATED",
        userId: req.user?._id,
        projectId: req.params.projectId,
        fileId: req.params.fileId,
      })

      return res.status(200).json(file)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.delete(
  "/:projectId/files/:fileId",
  requireAuth,
  requireProjectRole(["editor"]),
  [param("projectId").isString().notEmpty(), param("fileId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      await ProjectService.deleteFile(req.params.fileId)

      await LogService.createLog({
        actionType: "FILE_DELETED",
        userId: req.user?._id,
        projectId: req.params.projectId,
        fileId: req.params.fileId,
      })

      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.get(
  "/:projectId/files/:fileId/versions",
  requireAuth,
  requireProjectRole(["viewer"]),
  [param("projectId").isString().notEmpty(), param("fileId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const versions = await ProjectService.getFileVersions(req.params.fileId)
      return res.status(200).json(versions)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.post(
  "/:projectId/tests",
  requireAuth,
  requireProjectRole(["editor"]),
  [
    param("projectId").isString().notEmpty(),
    body("name").isString().notEmpty(),
    body("language").isString().notEmpty(),
    body("expectedOutput").isString(),
    body("input").optional().isString(),
    body("hidden").optional().isBoolean(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const testCase = await ProjectService.createTestCase({
        projectId: req.params.projectId,
        name: req.body.name,
        language: req.body.language,
        input: req.body.input ?? "",
        expectedOutput: req.body.expectedOutput,
        hidden: req.body.hidden,
        userId: String(req.user?._id),
      })

      return res.status(201).json(testCase)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.get(
  "/:projectId/tests",
  requireAuth,
  requireProjectRole(["viewer"]),
  [param("projectId").isString().notEmpty(), query("language").optional().isString()],
  validateRequest,
  async (req, res, next) => {
    try {
      const tests = await ProjectService.listTestCases(req.params.projectId, req.query.language as string)
      return res.status(200).json(tests)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.put(
  "/:projectId/tests/:testId",
  requireAuth,
  requireProjectRole(["editor"]),
  [param("projectId").isString().notEmpty(), param("testId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const test = await ProjectService.updateTestCase(req.params.testId, req.body, String(req.user?._id))
      return res.status(200).json(test)
    } catch (error) {
      return next(error)
    }
  }
)

projectRoutes.delete(
  "/:projectId/tests/:testId",
  requireAuth,
  requireProjectRole(["editor"]),
  [param("projectId").isString().notEmpty(), param("testId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      await ProjectService.deleteTestCase(req.params.testId)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  }
)

export { projectRoutes }
