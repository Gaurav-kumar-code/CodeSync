"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authService_1 = require("../services/authService");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const authMiddleware_1 = require("../middleware/authMiddleware");
const httpError_1 = require("../utils/httpError");
const authRoutes = (0, express_1.Router)();
exports.authRoutes = authRoutes;
authRoutes.post("/signup", [
    (0, express_validator_1.body)("email").isEmail(),
    (0, express_validator_1.body)("password").isString().isLength({ min: 8 }),
    (0, express_validator_1.body)("username").isString().isLength({ min: 2, max: 32 }),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const result = await authService_1.AuthService.signup(req.body);
        return res.status(201).json(result);
    }
    catch (error) {
        return next(error);
    }
});
authRoutes.post("/login", [(0, express_validator_1.body)("email").isEmail(), (0, express_validator_1.body)("password").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const result = await authService_1.AuthService.login(req.body);
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
});
authRoutes.post("/refresh", [(0, express_validator_1.body)("refreshToken").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const tokens = await authService_1.AuthService.refreshAccessToken(refreshToken);
        return res.status(200).json(tokens);
    }
    catch (error) {
        return next(error);
    }
});
authRoutes.post("/logout", authMiddleware_1.requireAuth, async (req, res, next) => {
    try {
        if (!req.user?._id) {
            throw new httpError_1.HttpError(401, "User is not authenticated");
        }
        await authService_1.AuthService.logout(req.user._id);
        return res.status(204).send();
    }
    catch (error) {
        return next(error);
    }
});
authRoutes.get("/me", authMiddleware_1.requireAuth, async (req, res, next) => {
    try {
        const user = await authService_1.AuthService.getUserById(String(req.user?._id));
        if (!user) {
            throw new httpError_1.HttpError(404, "User not found");
        }
        return res.status(200).json({
            _id: String(user._id),
            email: user.email,
            profile: user.profile,
            preferences: user.preferences,
            github: user.github
                ? {
                    id: user.github.id,
                    username: user.github.username,
                    avatarUrl: user.github.avatarUrl,
                    profileUrl: user.github.profileUrl,
                }
                : null,
        });
    }
    catch (error) {
        return next(error);
    }
});
authRoutes.post("/password-reset/request", [(0, express_validator_1.body)("email").isEmail()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const { resetToken } = await authService_1.AuthService.createPasswordResetToken(req.body.email);
        return res.status(200).json({
            message: "If the account exists, a reset token has been generated",
            resetToken,
        });
    }
    catch (error) {
        return next(error);
    }
});
authRoutes.post("/password-reset/confirm", [
    (0, express_validator_1.body)("resetToken").isString().notEmpty(),
    (0, express_validator_1.body)("password").isString().isLength({ min: 8 }),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        await authService_1.AuthService.resetPassword(req.body.resetToken, req.body.password);
        return res.status(200).json({ message: "Password has been reset" });
    }
    catch (error) {
        return next(error);
    }
});
