"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const httpError_1 = require("../utils/httpError");
const logService_1 = require("../services/logService");
const notFoundHandler = (_req, _res, next) => {
    next(new httpError_1.HttpError(404, "Route not found"));
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = async (error, req, res, _next) => {
    const statusCode = (0, httpError_1.isHttpError)(error) ? error.statusCode : 500;
    const message = (0, httpError_1.isHttpError)(error) && error.message
        ? error.message
        : "An unexpected server error occurred";
    try {
        await logService_1.LogService.createLog({
            actionType: "ERROR",
            userId: req.user?._id,
            projectId: typeof req.body?.projectId === "string" ? req.body.projectId : undefined,
            ipAddress: req.ip,
            userAgent: req.get("user-agent") ?? "",
            requestId: req.requestId,
            statusCode,
            success: false,
            errorMessage: message,
            details: {
                method: req.method,
                path: req.originalUrl,
                body: req.body,
            },
        });
    }
    catch (logError) {
        console.error("Failed to write error log", logError);
    }
    if (statusCode >= 500) {
        console.error(error);
    }
    return res.status(statusCode).json({
        message,
        requestId: req.requestId,
        details: (0, httpError_1.isHttpError)(error) ? error.details : undefined,
    });
};
exports.errorHandler = errorHandler;
