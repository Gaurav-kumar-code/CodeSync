"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireResourceOwner = exports.requireProjectRole = void 0;
const models_1 = require("../models");
const hasRolePriority = (role, required) => {
    const roleRank = {
        owner: 4,
        editor: 3,
        commenter: 2,
        viewer: 1,
    };
    return required.some((requiredRole) => roleRank[role] >= roleRank[requiredRole]);
};
const requireProjectRole = (roles) => {
    return async (req, res, next) => {
        const projectId = req.params.projectId || req.body.projectId;
        const currentUser = req.user;
        const userId = currentUser?._id;
        if (!projectId || !userId || !currentUser) {
            return res.status(400).json({ message: "projectId and authenticated user are required" });
        }
        const project = await models_1.ProjectModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        if (String(project.owner) === String(userId)) {
            req.user = {
                _id: currentUser._id,
                email: currentUser.email,
                username: currentUser.username,
                role: "owner",
            };
            return next();
        }
        const collaborator = project.collaborators.find((item) => String(item.user) === String(userId));
        if (!collaborator) {
            return res.status(403).json({ message: "No access to this project" });
        }
        const role = collaborator.role;
        if (!hasRolePriority(role, roles)) {
            return res.status(403).json({ message: "Insufficient project role" });
        }
        req.user = {
            _id: currentUser._id,
            email: currentUser.email,
            username: currentUser.username,
            role,
        };
        return next();
    };
};
exports.requireProjectRole = requireProjectRole;
const requireResourceOwner = (fieldName = "userId") => {
    return (req, res, next) => {
        const resourceOwnerId = req.params[fieldName] || req.body[fieldName];
        if (String(resourceOwnerId) !== String(req.user?._id)) {
            return res.status(403).json({ message: "Ownership check failed" });
        }
        return next();
    };
};
exports.requireResourceOwner = requireResourceOwner;
