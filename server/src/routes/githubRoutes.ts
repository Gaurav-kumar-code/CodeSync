import { Router } from "express"
import { body, param, query } from "express-validator"
import { Types } from "mongoose"
import { requireAuth } from "../middleware/authMiddleware"
import { validateRequest } from "../middleware/validationMiddleware"
import { AuthService } from "../services/authService"
import { GitHubService } from "../services/githubService"
import { ProjectService } from "../services/projectService"
import { FileModel, ProjectModel } from "../models"
import { detectLanguageFromFileName } from "../utils/language"
import { LogService } from "../services/logService"

const githubRoutes = Router()

githubRoutes.get("/auth-url", [query("state").optional().isString()], validateRequest, (req, res) => {
  const state = (req.query.state as string) || new Types.ObjectId().toString()
  const authUrl = GitHubService.getAuthorizationUrl(state)

  return res.status(200).json({ authUrl, state })
})

githubRoutes.post(
  "/callback",
  [body("code").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const { code } = req.body
      const tokenResponse = await GitHubService.exchangeCodeForToken(code)
      const profile = await GitHubService.getUserProfile(tokenResponse.accessToken)

      const auth = await AuthService.upsertGitHubUser({
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
      })

      return res.status(200).json(auth)
    } catch (error) {
      return next(error)
    }
  }
)

githubRoutes.get(
  "/repositories",
  requireAuth,
  [query("page").optional().isInt({ min: 1 }), query("perPage").optional().isInt({ min: 1, max: 100 })],
  validateRequest,
  async (req, res, next) => {
    try {
      const page = Number(req.query.page ?? 1)
      const perPage = Number(req.query.perPage ?? 20)

      const repositories = await GitHubService.listRepositories(String(req.user?._id), page, perPage)

      return res.status(200).json(repositories)
    } catch (error) {
      return next(error)
    }
  }
)

githubRoutes.post(
  "/import-repository",
  requireAuth,
  [
    body("owner").isString().notEmpty(),
    body("repo").isString().notEmpty(),
    body("branch").optional().isString(),
    body("projectId").optional().isString(),
    body("createNewProject").optional().isBoolean(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { owner, repo, branch, projectId, createNewProject } = req.body as {
        owner: string
        repo: string
        branch?: string
        projectId?: string
        createNewProject?: boolean
      }

      const imported = await GitHubService.importRepository({
        userId: String(req.user?._id),
        owner,
        repo,
        branch,
      })

      let targetProjectId = projectId

      if (!targetProjectId || createNewProject) {
        const project = await ProjectService.createProject({
          userId: String(req.user?._id),
          name: repo,
          description: `Imported from ${owner}/${repo}`,
          tags: ["github", "imported"],
          visibility: "private",
        })

        targetProjectId = String(project._id)
      }

      const directorySet = new Set<string>()
      for (const file of imported.files) {
        const parts = file.path.split("/")
        for (let index = 1; index < parts.length; index += 1) {
          directorySet.add(parts.slice(0, index).join("/"))
        }
      }

      const directories = Array.from(directorySet).sort((a, b) => a.length - b.length)

      const pathToId = new Map<string, string>()
      for (const directoryPath of directories) {
        const name = directoryPath.split("/").pop() ?? directoryPath
        const parentPath = directoryPath.includes("/")
          ? directoryPath.slice(0, directoryPath.lastIndexOf("/"))
          : ""

        const existing = await FileModel.findOne({
          project: targetProjectId,
          path: directoryPath,
        })

        if (existing) {
          pathToId.set(directoryPath, String(existing._id))
          continue
        }

        const createdDirectory = await FileModel.create({
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
        })

        pathToId.set(directoryPath, String(createdDirectory._id))
      }

      for (const file of imported.files) {
        const name = file.path.split("/").pop() ?? file.path
        const parentPath = file.path.includes("/")
          ? file.path.slice(0, file.path.lastIndexOf("/"))
          : ""

        await FileModel.findOneAndUpdate(
          { project: targetProjectId, path: file.path },
          {
            $set: {
              parentDirectory: parentPath ? pathToId.get(parentPath) ?? null : null,
              name,
              path: file.path,
              isDirectory: false,
              content: file.content,
              language: detectLanguageFromFileName(name),
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
          },
          {
            upsert: true,
            new: true,
          }
        )
      }

      await ProjectModel.findByIdAndUpdate(targetProjectId, {
        github: {
          repoOwner: owner,
          repoName: repo,
          repoUrl: `https://github.com/${owner}/${repo}`,
          defaultBranch: imported.branch,
          lastSyncAt: new Date(),
        },
      })

      await ProjectService.refreshProjectStats(targetProjectId)

      await LogService.createLog({
        actionType: "GITHUB_IMPORT",
        userId: req.user?._id,
        projectId: targetProjectId,
        details: {
          owner,
          repo,
          branch: imported.branch,
          fileCount: imported.files.length,
        },
      })

      return res.status(200).json({
        projectId: targetProjectId,
        imported,
      })
    } catch (error) {
      return next(error)
    }
  }
)

githubRoutes.post(
  "/push-to-github",
  requireAuth,
  [
    body("owner").isString().notEmpty(),
    body("repo").isString().notEmpty(),
    body("branch").isString().notEmpty(),
    body("message").isString().notEmpty(),
    body("projectId").optional().isString(),
    body("files").optional().isArray(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const {
        owner,
        repo,
        branch,
        message,
        projectId,
        files,
      }: {
        owner: string
        repo: string
        branch: string
        message: string
        projectId?: string
        files?: Array<{ path: string; content: string }>
      } = req.body

      const payloadFiles = files?.length
        ? files
        : projectId
        ? (
            await FileModel.find({
              project: projectId,
              isDirectory: false,
            }).lean()
          ).map((file) => ({ path: file.path, content: file.content }))
        : []

      const pushResult = await GitHubService.pushCode(String(req.user?._id), {
        owner,
        repo,
        branch,
        message,
        files: payloadFiles,
      })

      await LogService.createLog({
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
      })

      return res.status(200).json(pushResult)
    } catch (error) {
      return next(error)
    }
  }
)

githubRoutes.get(
  "/branches/:owner/:repo",
  requireAuth,
  [param("owner").isString().notEmpty(), param("repo").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const branches = await GitHubService.getBranches(
        String(req.user?._id),
        req.params.owner,
        req.params.repo
      )

      return res.status(200).json(branches)
    } catch (error) {
      return next(error)
    }
  }
)

export { githubRoutes }
