"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authMiddleware_1 = require("../middleware/authMiddleware");
const rbacMiddleware_1 = require("../middleware/rbacMiddleware");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const logService_1 = require("../services/logService");
const analyticsRoutes = (0, express_1.Router)();
exports.analyticsRoutes = analyticsRoutes;
analyticsRoutes.get("/:projectId/analytics", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [
    (0, express_validator_1.param)("projectId").isString().notEmpty(),
    (0, express_validator_1.query)("from").optional().isISO8601(),
    (0, express_validator_1.query)("to").optional().isISO8601(),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const analytics = await logService_1.LogService.getProjectStatistics(req.params.projectId, req.query.from, req.query.to);
        return res.status(200).json(analytics);
    }
    catch (error) {
        return next(error);
    }
});
analyticsRoutes.get("/:projectId/logs", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 1000 })], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const limit = Number(req.query.limit ?? 200);
        const logs = await logService_1.LogService.getProjectActivityLogs(req.params.projectId, limit);
        return res.status(200).json(logs);
    }
    catch (error) {
        return next(error);
    }
});
analyticsRoutes.get("/:projectId/execution-history", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 500 })], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const limit = Number(req.query.limit ?? 100);
        const history = await logService_1.LogService.getExecutionHistory(req.params.projectId, limit);
        return res.status(200).json(history);
    }
    catch (error) {
        return next(error);
    }
});
analyticsRoutes.get("/:projectId/error-logs", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.query)("limit").optional().isInt({ min: 1, max: 500 })], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const limit = Number(req.query.limit ?? 100);
        const errors = await logService_1.LogService.getErrorLogs(req.params.projectId, limit);
        return res.status(200).json(errors);
    }
    catch (error) {
        return next(error);
    }
});
analyticsRoutes.get("/:projectId/report", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [(0, express_validator_1.param)("projectId").isString().notEmpty(), (0, express_validator_1.query)("period").optional().isIn(["daily", "weekly", "monthly"])], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const period = req.query.period ?? "weekly";
        const report = await logService_1.LogService.getActivityReport(req.params.projectId, period);
        return res.status(200).json(report);
    }
    catch (error) {
        return next(error);
    }
});
analyticsRoutes.get("/:projectId/stats", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [
    (0, express_validator_1.param)("projectId").isString().notEmpty(),
    (0, express_validator_1.query)("from").optional().isISO8601(),
    (0, express_validator_1.query)("to").optional().isISO8601(),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const stats = await logService_1.LogService.getProjectStatistics(req.params.projectId, req.query.from, req.query.to);
        return res.status(200).json(stats.totals);
    }
    catch (error) {
        return next(error);
    }
});
analyticsRoutes.post("/:projectId/export-logs", authMiddleware_1.requireAuth, (0, rbacMiddleware_1.requireProjectRole)(["viewer"]), [(0, express_validator_1.param)("projectId").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const csv = await logService_1.LogService.exportProjectLogsCsv(req.params.projectId);
        const fileName = `project-${req.params.projectId}-logs.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        return res.status(200).send(csv);
    }
    catch (error) {
        return next(error);
    }
});
