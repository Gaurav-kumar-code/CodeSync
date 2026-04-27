"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executionRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const executionService_1 = require("../services/executionService");
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const logService_1 = require("../services/logService");
const executionRoutes = (0, express_1.Router)();
exports.executionRoutes = executionRoutes;
executionRoutes.post("/run-code", [(0, express_validator_1.body)("code").isString().notEmpty(), (0, express_validator_1.body)("language").isString().notEmpty()], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const { code, language, input, files } = req.body;
        const startedAt = Date.now();
        const response = await (0, executionService_1.runOneCompiler)({ code, language, input, files });
        await logService_1.LogService.createLog({
            actionType: "CODE_EXECUTED",
            userId: req.user?._id,
            projectId: req.body.projectId,
            statusCode: 200,
            durationMs: Date.now() - startedAt,
            success: true,
            details: {
                language,
            },
        });
        return res.status(200).json(response);
    }
    catch (error) {
        return next(error);
    }
});
executionRoutes.post("/evaluate-code", [
    (0, express_validator_1.body)("code").isString().notEmpty(),
    (0, express_validator_1.body)("language").isString().notEmpty(),
    (0, express_validator_1.body)("mode").isIn(["run", "submit"]),
    (0, express_validator_1.body)("testCases").isArray({ min: 1 }),
], validationMiddleware_1.validateRequest, async (req, res, next) => {
    try {
        const { code, language, testCases, mode, files, } = req.body;
        const startedAt = Date.now();
        const result = await (0, executionService_1.evaluateAgainstTestCases)({
            code,
            language,
            testCases,
            mode,
            files,
        });
        await logService_1.LogService.createLog({
            actionType: "CODE_EVALUATED",
            userId: req.user?._id,
            projectId: req.body.projectId,
            statusCode: 200,
            durationMs: Date.now() - startedAt,
            success: true,
            details: {
                language,
                mode,
                totalCount: result.totalCount,
                passedCount: result.passedCount,
            },
        });
        return res.status(200).json(result);
    }
    catch (error) {
        return next(error);
    }
});
