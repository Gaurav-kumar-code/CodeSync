"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const copilotRoutes_1 = __importDefault(require("./copilotRoutes"));
const authRoutes_1 = require("./authRoutes");
const githubRoutes_1 = require("./githubRoutes");
const uploadRoutes_1 = require("./uploadRoutes");
const analyticsRoutes_1 = require("./analyticsRoutes");
const projectRoutes_1 = require("./projectRoutes");
const executionRoutes_1 = require("./executionRoutes");
const apiRouter = (0, express_1.Router)();
exports.apiRouter = apiRouter;
apiRouter.use("/copilot", copilotRoutes_1.default);
apiRouter.use("/auth", authRoutes_1.authRoutes);
apiRouter.use("/github", githubRoutes_1.githubRoutes);
apiRouter.use("/uploads", uploadRoutes_1.uploadRoutes);
apiRouter.use("/projects", projectRoutes_1.projectRoutes);
apiRouter.use("/projects", analyticsRoutes_1.analyticsRoutes);
apiRouter.use("/", executionRoutes_1.executionRoutes);
apiRouter.get("/health", (_req, res) => {
    return res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});
