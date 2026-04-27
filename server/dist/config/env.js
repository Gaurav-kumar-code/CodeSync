"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getEnv = (key, fallback) => {
    const value = process.env[key] ?? fallback;
    if (!value) {
        throw new Error(`Missing required env var: ${key}`);
    }
    return value;
};
const getNumber = (key, fallback) => {
    const raw = process.env[key];
    if (!raw) {
        return fallback;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
        throw new Error(`Invalid number env var: ${key}`);
    }
    return parsed;
};
const getBoolean = (key, fallback) => {
    const raw = process.env[key];
    if (!raw) {
        return fallback;
    }
    return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
};
const nodeEnv = process.env.NODE_ENV ?? "development";
const env = {
    nodeEnv,
    port: getNumber("PORT", 3000),
    mongoUri: getEnv("MONGODB_URI", "mongodb://localhost:27017/code-sync"),
    allowNoDbStartup: getBoolean("ALLOW_NO_DB_STARTUP", nodeEnv !== "production"),
    jwtSecret: getEnv("JWT_SECRET", "change-me-in-production"),
    jwtExpire: process.env.JWT_EXPIRE ?? "7d",
    bcryptRounds: getNumber("BCRYPT_ROUNDS", 10),
    githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    githubRedirectUri: process.env.GITHUB_REDIRECT_URI ?? "",
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    maxFileSize: getNumber("MAX_FILE_SIZE", 104857600),
    chunkSize: getNumber("CHUNK_SIZE", 5242880),
    uploadDir: process.env.UPLOAD_DIR ?? "uploads",
    filesDir: process.env.FILES_DIR ?? "files",
    logLevel: process.env.LOG_LEVEL ?? "info",
    encryptionKey: getEnv("ENCRYPTION_KEY", "01234567890123456789012345678901"),
    oneCompilerApiKey: process.env.ONECOMPILER_API_KEY ?? "",
    previewAssetBaseUrl: process.env.PREVIEW_ASSET_BASE_URL ?? "",
};
exports.env = env;
