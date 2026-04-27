"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionModel = void 0;
const mongoose_1 = require("mongoose");
const participantSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    socketId: {
        type: String,
        required: true,
    },
    joinedAt: {
        type: Date,
        default: () => new Date(),
    },
    leftAt: { type: Date },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { _id: false });
const sessionSchema = new mongoose_1.Schema({
    project: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true,
    },
    participants: {
        type: [participantSchema],
        default: [],
    },
    status: {
        type: String,
        enum: ["active", "ended"],
        default: "active",
        index: true,
    },
    startedAt: {
        type: Date,
        default: () => new Date(),
    },
    endedAt: { type: Date },
    durationSeconds: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
    versionKey: false,
});
sessionSchema.index({ project: 1, status: 1, startedAt: -1 });
sessionSchema.index({ "participants.user": 1, startedAt: -1 });
const SessionModel = (0, mongoose_1.model)("Session", sessionSchema);
exports.SessionModel = SessionModel;
