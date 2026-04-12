"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPreviewAssets = exports.getPreviewAsset = void 0;
const path_1 = __importDefault(require("path"));
const previewVirtualFileSystem_1 = require("./previewVirtualFileSystem");
const PREVIEW_SESSION_LIMIT = 50;
const PREVIEW_SESSION_TTL_MS = 1000 * 60 * 15;
const previewSessions = new Map();
const MIME_BY_EXTENSION = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
};
const getAssetMimeType = (assetPath) => {
    const extension = path_1.default.extname(assetPath).toLowerCase();
    return MIME_BY_EXTENSION[extension] || "application/octet-stream";
};
const decodeAssetContent = (rawContent) => {
    const dataUrlMatch = rawContent.match(/^data:.*?;base64,(.+)$/);
    if (dataUrlMatch) {
        return Buffer.from(dataUrlMatch[1], "base64");
    }
    return Buffer.from(rawContent, "utf8");
};
const purgeExpiredSessions = () => {
    const now = Date.now();
    for (const [previewId, session] of previewSessions.entries()) {
        if (now - session.updatedAt > PREVIEW_SESSION_TTL_MS) {
            previewSessions.delete(previewId);
        }
    }
};
const trimSessionCount = () => {
    if (previewSessions.size <= PREVIEW_SESSION_LIMIT) {
        return;
    }
    const orderedSessions = Array.from(previewSessions.values()).sort((a, b) => a.updatedAt - b.updatedAt);
    const extraCount = orderedSessions.length - PREVIEW_SESSION_LIMIT;
    for (let index = 0; index < extraCount; index += 1) {
        previewSessions.delete(orderedSessions[index].previewId);
    }
};
const setPreviewAssets = (previewId, assets) => {
    purgeExpiredSessions();
    const storedAssets = new Map();
    for (const [assetPath, rawContent] of assets.entries()) {
        const normalizedPath = (0, previewVirtualFileSystem_1.normalizeVirtualPath)(assetPath);
        storedAssets.set(normalizedPath, {
            content: decodeAssetContent(rawContent),
            mimeType: getAssetMimeType(normalizedPath),
        });
    }
    previewSessions.set(previewId, {
        previewId,
        updatedAt: Date.now(),
        assets: storedAssets,
    });
    trimSessionCount();
};
exports.setPreviewAssets = setPreviewAssets;
const getPreviewAsset = (previewId, assetPath) => {
    purgeExpiredSessions();
    const session = previewSessions.get(previewId);
    if (!session) {
        return null;
    }
    session.updatedAt = Date.now();
    const normalizedPath = (0, previewVirtualFileSystem_1.normalizeVirtualPath)(assetPath);
    return session.assets.get(normalizedPath) || null;
};
exports.getPreviewAsset = getPreviewAsset;
