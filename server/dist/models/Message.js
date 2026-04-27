"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageModel = void 0;
const mongoose_1 = require("mongoose");
const readBySchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    readAt: {
        type: Date,
        default: () => new Date(),
    },
}, { _id: false });
const messageSchema = new mongoose_1.Schema({
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    receiver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        index: true,
    },
    project: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Project",
        index: true,
    },
    session: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Session",
        index: true,
    },
    content: {
        type: String,
        required: true,
        maxlength: 8000,
    },
    markdown: {
        type: Boolean,
        default: true,
    },
    mentions: {
        type: [mongoose_1.Schema.Types.ObjectId],
        ref: "User",
        default: [],
    },
    readBy: {
        type: [readBySchema],
        default: [],
    },
}, {
    timestamps: true,
    versionKey: false,
});
messageSchema.index({ project: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
const MessageModel = (0, mongoose_1.model)("Message", messageSchema);
exports.MessageModel = MessageModel;
