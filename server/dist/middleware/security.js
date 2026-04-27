"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applySecurityMiddleware = void 0;
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../config/env");
const applySecurityMiddleware = (app) => {
    app.set("trust proxy", 1);
    app.use((0, cors_1.default)({
        origin: env_1.env.corsOrigin,
        credentials: true,
    }));
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }));
    app.use((0, compression_1.default)());
    app.use((0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 600,
        standardHeaders: true,
        legacyHeaders: false,
    }));
    app.use(express_1.default.json({ limit: "20mb" }));
    app.use(express_1.default.urlencoded({ extended: true, limit: "20mb" }));
};
exports.applySecurityMiddleware = applySecurityMiddleware;
