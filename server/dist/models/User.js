"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const userPreferenceSchema = new mongoose_1.Schema({
    theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
    },
    fontSize: {
        type: Number,
        min: 10,
        max: 24,
        default: 14,
    },
    editor: {
        tabSize: { type: Number, default: 2 },
        useSoftTabs: { type: Boolean, default: true },
        wordWrap: {
            type: String,
            enum: ["on", "off", "bounded"],
            default: "on",
        },
        minimap: { type: Boolean, default: true },
        showLineNumbers: { type: Boolean, default: true },
    },
}, { _id: false });
const githubSchema = new mongoose_1.Schema({
    id: { type: String },
    username: { type: String },
    avatarUrl: { type: String },
    profileUrl: { type: String },
    accessTokenEncrypted: { type: String },
    refreshTokenEncrypted: { type: String },
    tokenExpiresAt: { type: Date },
}, { _id: false });
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    passwordHash: {
        type: String,
        select: false,
    },
    refreshTokenHash: {
        type: String,
        select: false,
    },
    passwordResetTokenHash: {
        type: String,
        select: false,
    },
    passwordResetExpiresAt: {
        type: Date,
        select: false,
    },
    profile: {
        username: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 32,
            unique: true,
            index: true,
        },
        avatar: { type: String },
        bio: { type: String, maxlength: 280, default: "" },
    },
    github: githubSchema,
    preferences: {
        type: userPreferenceSchema,
        default: () => ({}),
    },
    lastLoginAt: { type: Date },
    lastActiveAt: { type: Date, default: () => new Date() },
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
    versionKey: false,
});
userSchema.index({ "github.id": 1 }, { sparse: true });
userSchema.index({ createdAt: -1 });
const UserModel = (0, mongoose_1.model)("User", userSchema);
exports.UserModel = UserModel;
