"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const crypto_1 = require("crypto");
const logService_1 = require("../services/logService");
const requestLogger = (req, res, next) => {
    const startedAt = Date.now();
    req.requestId = (0, crypto_1.randomUUID)();
    res.on("finish", () => {
        const durationMs = Date.now() - startedAt;
        let actionType = "REQUEST";
        if (req.originalUrl.includes("run-code")) {
            actionType = "CODE_EXECUTED";
        }
        if (req.originalUrl.includes("evaluate-code")) {
            actionType = "CODE_EVALUATED";
        }
        if (req.originalUrl.includes("upload")) {
            actionType = "UPLOAD_CHUNK";
        }
        void logService_1.LogService.createLog({
            actionType,
            userId: req.user?._id,
            projectId: req.params?.projectId,
            ipAddress: req.ip,
            userAgent: req.get("user-agent") ?? "",
            requestId: req.requestId,
            statusCode: res.statusCode,
            durationMs,
            success: res.statusCode < 400,
            details: {
                method: req.method,
                path: req.originalUrl,
                query: req.query,
            },
            errorMessage: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : "",
        }).catch((error) => {
            console.error("Request logger failed", error);
        });
    });
    next();
};
exports.requestLogger = requestLogger;
