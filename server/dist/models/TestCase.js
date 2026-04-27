"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestCaseModel = void 0;
const mongoose_1 = require("mongoose");
const testCaseSchema = new mongoose_1.Schema({
    project: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    language: {
        type: String,
        required: true,
    },
    input: {
        type: String,
        default: "",
    },
    expectedOutput: {
        type: String,
        required: true,
    },
    hidden: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});
testCaseSchema.index({ project: 1, language: 1, createdAt: -1 });
const TestCaseModel = (0, mongoose_1.model)("TestCase", testCaseSchema);
exports.TestCaseModel = TestCaseModel;
