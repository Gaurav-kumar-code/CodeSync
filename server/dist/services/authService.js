"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicUser = exports.validatePasswordStrength = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const models_1 = require("../models");
const crypto_2 = require("../utils/crypto");
const httpError_1 = require("../utils/httpError");
const refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000;
const validatePasswordStrength = (password) => {
    const errors = [];
    if (password.length < 8) {
        errors.push("Password must be at least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
        errors.push("Password must include an uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
        errors.push("Password must include a lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
        errors.push("Password must include a number");
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push("Password must include a special character");
    }
    return {
        valid: errors.length === 0,
        errors,
    };
};
exports.validatePasswordStrength = validatePasswordStrength;
const toPublicUser = (user) => ({
    _id: String(user._id),
    email: user.email,
    username: user.profile?.username ?? user.email?.split("@")[0] ?? "user",
    avatar: user.profile?.avatar,
    bio: user.profile?.bio,
    preferences: user.preferences,
    github: user.github
        ? {
            id: user.github.id,
            username: user.github.username,
            avatarUrl: user.github.avatarUrl,
            profileUrl: user.github.profileUrl,
        }
        : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});
exports.toPublicUser = toPublicUser;
class AuthService {
    static generateAccessToken(payload) {
        const expiresIn = env_1.env.jwtExpire;
        return jsonwebtoken_1.default.sign(payload, env_1.env.jwtSecret, {
            expiresIn,
        });
    }
    static generateRefreshToken(userId) {
        return jsonwebtoken_1.default.sign({ userId, tokenType: "refresh" }, env_1.env.jwtSecret, {
            expiresIn: "30d",
        });
    }
    static verifyAccessToken(token) {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
        return decoded;
    }
    static async hashPassword(password) {
        const rounds = env_1.env.bcryptRounds;
        return bcryptjs_1.default.hash(password, rounds);
    }
    static async comparePassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    static async signup(params) {
        const email = params.email.toLowerCase().trim();
        const username = params.username.trim();
        const existing = await models_1.UserModel.findOne({
            $or: [{ email }, { "profile.username": username }],
        });
        if (existing) {
            throw new httpError_1.HttpError(409, "Email or username is already registered");
        }
        const passwordCheck = validatePasswordStrength(params.password);
        if (!passwordCheck.valid) {
            throw new httpError_1.HttpError(400, "Weak password", { errors: passwordCheck.errors });
        }
        const passwordHash = await this.hashPassword(params.password);
        const user = await models_1.UserModel.create({
            email,
            passwordHash,
            profile: {
                username,
            },
            lastLoginAt: new Date(),
            lastActiveAt: new Date(),
        });
        const accessToken = this.generateAccessToken({
            userId: String(user._id),
            email: user.email,
            username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
        });
        const refreshToken = this.generateRefreshToken(String(user._id));
        user.refreshTokenHash = await this.hashPassword(refreshToken);
        await user.save();
        return {
            user: toPublicUser(user),
            accessToken,
            refreshToken,
        };
    }
    static async login(params) {
        const email = params.email.toLowerCase().trim();
        const user = await models_1.UserModel.findOne({ email }).select("+passwordHash +refreshTokenHash");
        if (!user || !user.passwordHash) {
            throw new httpError_1.HttpError(401, "Invalid credentials");
        }
        const isValid = await this.comparePassword(params.password, user.passwordHash);
        if (!isValid) {
            throw new httpError_1.HttpError(401, "Invalid credentials");
        }
        const accessToken = this.generateAccessToken({
            userId: String(user._id),
            email: user.email,
            username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
        });
        const refreshToken = this.generateRefreshToken(String(user._id));
        user.refreshTokenHash = await this.hashPassword(refreshToken);
        user.lastLoginAt = new Date();
        user.lastActiveAt = new Date();
        await user.save();
        return {
            user: toPublicUser(user),
            accessToken,
            refreshToken,
        };
    }
    static async refreshAccessToken(refreshToken) {
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.env.jwtSecret);
        }
        catch {
            throw new httpError_1.HttpError(401, "Invalid refresh token");
        }
        if (decoded.tokenType !== "refresh") {
            throw new httpError_1.HttpError(401, "Invalid token type");
        }
        const user = await models_1.UserModel.findById(decoded.userId).select("+refreshTokenHash");
        if (!user || !user.refreshTokenHash) {
            throw new httpError_1.HttpError(401, "Refresh token not found");
        }
        const tokenMatches = await this.comparePassword(refreshToken, user.refreshTokenHash);
        if (!tokenMatches) {
            throw new httpError_1.HttpError(401, "Refresh token mismatch");
        }
        const nextAccessToken = this.generateAccessToken({
            userId: String(user._id),
            email: user.email,
            username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
        });
        const nextRefreshToken = this.generateRefreshToken(String(user._id));
        user.refreshTokenHash = await this.hashPassword(nextRefreshToken);
        user.lastActiveAt = new Date();
        await user.save();
        return {
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
        };
    }
    static async logout(userId) {
        await models_1.UserModel.findByIdAndUpdate(userId, {
            $unset: { refreshTokenHash: "" },
        });
    }
    static async getUserById(userId) {
        return models_1.UserModel.findById(userId);
    }
    static async createPasswordResetToken(email) {
        const user = await models_1.UserModel.findOne({ email: email.toLowerCase().trim() }).select("+passwordResetTokenHash +passwordResetExpiresAt");
        if (!user) {
            return { resetToken: null };
        }
        const rawToken = crypto_1.default.randomBytes(32).toString("hex");
        user.passwordResetTokenHash = await this.hashPassword(rawToken);
        user.passwordResetExpiresAt = new Date(Date.now() + refreshTokenTtlMs);
        await user.save();
        return { resetToken: rawToken };
    }
    static async resetPassword(resetToken, nextPassword) {
        const passwordCheck = validatePasswordStrength(nextPassword);
        if (!passwordCheck.valid) {
            throw new httpError_1.HttpError(400, "Weak password", { errors: passwordCheck.errors });
        }
        const users = await models_1.UserModel.find({
            passwordResetExpiresAt: { $gt: new Date() },
        }).select("+passwordResetTokenHash +passwordResetExpiresAt");
        for (const user of users) {
            const tokenHash = user.passwordResetTokenHash;
            if (!tokenHash) {
                continue;
            }
            const matches = await this.comparePassword(resetToken, tokenHash);
            if (!matches) {
                continue;
            }
            user.passwordHash = await this.hashPassword(nextPassword);
            user.passwordResetTokenHash = undefined;
            user.passwordResetExpiresAt = undefined;
            user.refreshTokenHash = undefined;
            await user.save();
            return;
        }
        throw new httpError_1.HttpError(400, "Invalid or expired reset token");
    }
    static async upsertGitHubUser(params) {
        const email = params.email.toLowerCase().trim();
        let user = await models_1.UserModel.findOne({
            $or: [{ email }, { "github.id": params.githubId }],
        }).select("+passwordHash +refreshTokenHash");
        if (!user) {
            user = await models_1.UserModel.create({
                email,
                profile: {
                    username: params.githubUsername,
                    avatar: params.avatarUrl,
                },
            });
        }
        user.github = {
            id: params.githubId,
            username: params.githubUsername,
            avatarUrl: params.avatarUrl,
            profileUrl: params.profileUrl,
            accessTokenEncrypted: (0, crypto_2.encrypt)(params.accessToken),
            refreshTokenEncrypted: params.refreshToken ? (0, crypto_2.encrypt)(params.refreshToken) : undefined,
            tokenExpiresAt: params.tokenExpiresAt,
        };
        user.lastLoginAt = new Date();
        user.lastActiveAt = new Date();
        await user.save();
        const accessToken = this.generateAccessToken({
            userId: String(user._id),
            email: user.email,
            username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
        });
        const refreshToken = this.generateRefreshToken(String(user._id));
        user.refreshTokenHash = await this.hashPassword(refreshToken);
        await user.save();
        return {
            user: toPublicUser(user),
            accessToken,
            refreshToken,
        };
    }
}
exports.AuthService = AuthService;
