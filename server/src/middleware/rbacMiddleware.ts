import { NextFunction, Request, Response } from "express"
import { ProjectModel } from "../models"
import { CollaboratorRole } from "../types/auth"

const hasRolePriority = (role: CollaboratorRole, required: CollaboratorRole[]) => {
  const roleRank: Record<CollaboratorRole, number> = {
    owner: 4,
    editor: 3,
    commenter: 2,
    viewer: 1,
  }

  return required.some((requiredRole) => roleRank[role] >= roleRank[requiredRole])
}

const requireProjectRole = (roles: CollaboratorRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const projectId = req.params.projectId || req.body.projectId
    const currentUser = req.user
    const userId = currentUser?._id

    if (!projectId || !userId || !currentUser) {
      return res.status(400).json({ message: "projectId and authenticated user are required" })
    }

    const project = await ProjectModel.findById(projectId)
    if (!project) {
      return res.status(404).json({ message: "Project not found" })
    }

    if (String(project.owner) === String(userId)) {
      req.user = {
        _id: currentUser._id,
        email: currentUser.email,
        username: currentUser.username,
        role: "owner",
      }
      return next()
    }

    const collaborator = project.collaborators.find(
      (item: { user: unknown; role: string }) => String(item.user) === String(userId)
    )

    if (!collaborator) {
      return res.status(403).json({ message: "No access to this project" })
    }

    const role = collaborator.role as CollaboratorRole
    if (!hasRolePriority(role, roles)) {
      return res.status(403).json({ message: "Insufficient project role" })
    }

    req.user = {
      _id: currentUser._id,
      email: currentUser.email,
      username: currentUser.username,
      role,
    }
    return next()
  }
}

const requireResourceOwner = (fieldName: string = "userId") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const resourceOwnerId = req.params[fieldName] || req.body[fieldName]
    if (String(resourceOwnerId) !== String(req.user?._id)) {
      return res.status(403).json({ message: "Ownership check failed" })
    }

    return next()
  }
}

export { requireProjectRole, requireResourceOwner }
