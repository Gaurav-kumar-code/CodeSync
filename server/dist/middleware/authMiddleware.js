"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractBearerToken = exports.requireAuth = void 0;
const authService_1 = require("../services/authService");
const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        return null;
    }
    return authorizationHeader.replace("Bearer ", "").trim();
};
exports.extractBearerToken = extractBearerToken;
const requireAuth = async (req, res, next) => {
    try {
        const token = extractBearerToken(req.header("authorization"));
        if (!token) {
            return res.status(401).json({ message: "Missing bearer token" });
        }
        const payload = authService_1.AuthService.verifyAccessToken(token);
        const user = await authService_1.AuthService.getUserById(payload.userId);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        req.user = {
            _id: String(user._id),
            email: user.email,
            username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
        };
        return next();
    }
    catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.requireAuth = requireAuth;
