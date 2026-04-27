import path from "path"
import { Types } from "mongoose"
import { FileModel, ProjectModel, TestCaseModel } from "../models"
import { detectLanguageFromFileName } from "../utils/language"
import { HttpError } from "../utils/httpError"

class ProjectService {
  static async createProject(params: {
    userId: string
    name: string
    description?: string
    tags?: string[]
    visibility?: "private" | "link" | "public"
  }) {
    const project = await ProjectModel.create({
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
    })

    return project
  }

  static async listProjectsForUser(userId: string, search?: string) {
    const query: Record<string, unknown> = {
      $or: [{ owner: userId }, { "collaborators.user": userId }],
      isArchived: false,
    }

    if (search && search.trim()) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        },
      ]
    }

    return ProjectModel.find(query)
      .sort({ updatedAt: -1 })
      .populate("owner", "profile.username profile.avatar")
      .lean()
  }

  static async getProjectForUser(projectId: string, userId: string) {
    const project = await ProjectModel.findById(projectId)
      .populate("owner", "profile.username profile.avatar")
      .populate("collaborators.user", "profile.username profile.avatar email")

    if (!project) {
      throw new HttpError(404, "Project not found")
    }

    const hasAccess =
      String(project.owner) === userId ||
      project.collaborators.some((item) => String(item.user) === userId) ||
      project.visibility !== "private"

    if (!hasAccess) {
      throw new HttpError(403, "You do not have access to this project")
    }

    return project
  }

  static async updateProject(projectId: string, updates: Record<string, unknown>) {
    const project = await ProjectModel.findByIdAndUpdate(projectId, updates, {
      new: true,
    })

    if (!project) {
      throw new HttpError(404, "Project not found")
    }

    return project
  }

  static async deleteProject(projectId: string) {
    await Promise.all([
      FileModel.deleteMany({ project: projectId }),
      TestCaseModel.deleteMany({ project: projectId }),
      ProjectModel.findByIdAndDelete(projectId),
    ])
  }

  static async archiveProject(projectId: string) {
    const project = await ProjectModel.findByIdAndUpdate(
      projectId,
      {
        isArchived: true,
        archivedAt: new Date(),
      },
      { new: true }
    )

    if (!project) {
      throw new HttpError(404, "Project not found")
    }

    return project
  }

  static async inviteCollaborator(projectId: string, collaboratorUserId: string, role: string, invitedBy: string) {
    const project = await ProjectModel.findById(projectId)
    if (!project) {
      throw new HttpError(404, "Project not found")
    }

    const exists = project.collaborators.some(
      (collaborator) => String(collaborator.user) === collaboratorUserId
    )

    if (exists) {
      throw new HttpError(409, "Collaborator already added")
    }

    project.collaborators.push({
      user: new Types.ObjectId(collaboratorUserId),
      role: role as "owner" | "editor" | "viewer" | "commenter",
      invitedBy: new Types.ObjectId(invitedBy),
      invitedAt: new Date(),
    })

    await project.save()
    return project
  }

  static async removeCollaborator(projectId: string, collaboratorUserId: string) {
    const project = await ProjectModel.findById(projectId)
    if (!project) {
      throw new HttpError(404, "Project not found")
    }

    const nextCollaborators = project.collaborators.filter(
      (collaborator) => String(collaborator.user) !== collaboratorUserId
    )
    project.set("collaborators", nextCollaborators)

    await project.save()
    return project
  }

  static async changeCollaboratorRole(projectId: string, collaboratorUserId: string, role: string) {
    const project = await ProjectModel.findById(projectId)
    if (!project) {
      throw new HttpError(404, "Project not found")
    }

    const collaborator = project.collaborators.find(
      (item) => String(item.user) === collaboratorUserId
    )

    if (!collaborator) {
      throw new HttpError(404, "Collaborator not found")
    }

    collaborator.role = role as "owner" | "editor" | "viewer" | "commenter"
    await project.save()

    return project
  }

  static async createFile(params: {
    projectId: string
    name: string
    isDirectory?: boolean
    parentDirectory?: string | null
    content?: string
    userId: string
  }) {
    const parentDirectory = params.parentDirectory ?? null

    const parentPath = parentDirectory
      ? await FileModel.findById(parentDirectory).then((parent) => parent?.path ?? "")
      : ""

    const filePath = path.posix.join(parentPath, params.name)

    const file = await FileModel.create({
      project: params.projectId,
      parentDirectory,
      name: params.name,
      path: filePath,
      isDirectory: Boolean(params.isDirectory),
      content: params.isDirectory ? "" : params.content ?? "",
      language: params.isDirectory ? "plaintext" : detectLanguageFromFileName(params.name),
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
    })

    await this.refreshProjectStats(params.projectId)
    return file
  }

  static async getProjectFiles(projectId: string) {
    return FileModel.find({ project: projectId }).sort({ isDirectory: -1, name: 1 }).lean()
  }

  static async updateFile(params: {
    fileId: string
    content?: string
    name?: string
    userId: string
  }) {
    const file = await FileModel.findById(params.fileId)
    if (!file) {
      throw new HttpError(404, "File not found")
    }

    if (typeof params.name === "string" && params.name.trim()) {
      file.name = params.name.trim()
      file.language = detectLanguageFromFileName(file.name)

      if (file.parentDirectory) {
        const parent = await FileModel.findById(file.parentDirectory)
        file.path = path.posix.join(parent?.path ?? "", file.name)
      } else {
        file.path = file.name
      }
    }

    if (typeof params.content === "string" && !file.isDirectory) {
      file.content = params.content
      file.sizeBytes = Buffer.byteLength(params.content, "utf8")
      file.version += 1
      file.versions.push({
        version: file.version,
        content: params.content,
        modifiedBy: new Types.ObjectId(params.userId),
        modifiedAt: new Date(),
        message: "Updated content",
      })
    }

    file.lastModifiedBy = new Types.ObjectId(params.userId)
    await file.save()
    await this.refreshProjectStats(String(file.project))

    return file
  }

  static async deleteFile(fileId: string) {
    const file = await FileModel.findById(fileId)
    if (!file) {
      throw new HttpError(404, "File not found")
    }

    await FileModel.deleteOne({ _id: fileId })

    if (file.isDirectory) {
      await FileModel.deleteMany({
        project: file.project,
        path: { $regex: `^${file.path}/` },
      })
    }

    await this.refreshProjectStats(String(file.project))
  }

  static async getFileVersions(fileId: string) {
    const file = await FileModel.findById(fileId).lean()
    if (!file) {
      throw new HttpError(404, "File not found")
    }

    return file.versions
  }

  static async createTestCase(params: {
    projectId: string
    name: string
    language: string
    input: string
    expectedOutput: string
    hidden?: boolean
    userId: string
  }) {
    return TestCaseModel.create({
      project: params.projectId,
      name: params.name,
      language: params.language,
      input: params.input,
      expectedOutput: params.expectedOutput,
      hidden: params.hidden ?? false,
      createdBy: params.userId,
      updatedBy: params.userId,
    })
  }

  static async listTestCases(projectId: string, language?: string) {
    const query: Record<string, unknown> = { project: projectId }

    if (language) {
      query.language = language
    }

    return TestCaseModel.find(query).sort({ createdAt: -1 }).lean()
  }

  static async updateTestCase(
    testId: string,
    updates: {
      name?: string
      input?: string
      expectedOutput?: string
      hidden?: boolean
    },
    userId: string
  ) {
    const test = await TestCaseModel.findByIdAndUpdate(
      testId,
      {
        ...updates,
        updatedBy: userId,
      },
      { new: true }
    )

    if (!test) {
      throw new HttpError(404, "Test case not found")
    }

    return test
  }

  static async deleteTestCase(testId: string) {
    const deleted = await TestCaseModel.findByIdAndDelete(testId)
    if (!deleted) {
      throw new HttpError(404, "Test case not found")
    }
  }

  static async refreshProjectStats(projectId: string) {
    const [aggregate] = await FileModel.aggregate([
      {
        $match: {
          project: new Types.ObjectId(projectId),
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
    ])

    await ProjectModel.findByIdAndUpdate(projectId, {
      statistics: {
        fileCount: aggregate?.fileCount ?? 0,
        totalSizeBytes: aggregate?.totalSizeBytes ?? 0,
        lastModifiedAt: aggregate?.lastModifiedAt ?? new Date(),
      },
    })
  }
}

export { ProjectService }
