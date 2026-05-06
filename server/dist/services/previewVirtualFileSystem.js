"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAssetModuleUrl = exports.resolveVirtualImport = exports.normalizeVirtualPath = exports.isStylePath = exports.isAssetPath = exports.guessEntryFile = exports.getEsbuildLoader = exports.flattenFileTree = exports.CODE_EXTENSIONS = exports.ASSET_EXTENSIONS = void 0;
const path_1 = __importDefault(require("path"));
const CODE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];
exports.CODE_EXTENSIONS = CODE_EXTENSIONS;
const STYLE_EXTENSIONS = [".css"];
const ASSET_EXTENSIONS = [
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".bmp",
    ".avif",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".eot",
];
exports.ASSET_EXTENSIONS = ASSET_EXTENSIONS;
const ENTRY_CANDIDATES = [
    "/src/main.tsx",
    "/src/main.jsx",
    "/main.tsx",
    "/main.jsx",
    "/src/index.tsx",
    "/src/index.jsx",
    "/index.tsx",
    "/index.jsx",
    "/App.tsx",
    "/App.jsx",
];
const RESOLUTION_SUFFIXES = [
    "",
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    ".mjs",
    ".cjs",
    ".css",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".bmp",
    ".avif",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".eot",
    ".json",
    "/index.tsx",
    "/index.ts",
    "/index.jsx",
    "/index.js",
    "/index.css",
];
const normalizeVirtualPath = (filePath) => {
    const unixPath = filePath.replace(/\\/g, "/");
    const normalized = path_1.default.posix.normalize(`/${unixPath}`);
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
};
exports.normalizeVirtualPath = normalizeVirtualPath;
const flattenFileTree = (root) => {
    const files = new Map();
    const walk = (node, parentPath) => {
        const nodePath = parentPath === "" && node.type === "directory" && node.name === "root"
            ? ""
            : node.name
                ? `${parentPath}/${node.name}`.replace(/^\//, "")
                : parentPath.replace(/^\//, "");
        if (node.type === "file") {
            files.set(normalizeVirtualPath(nodePath), node.content || "");
            return;
        }
        for (const child of node.children || []) {
            walk(child, nodePath);
        }
    };
    walk(root, "");
    return files;
};
exports.flattenFileTree = flattenFileTree;
const guessEntryFile = (files, preferred) => {
    const normalizedPreferred = preferred ? normalizeVirtualPath(preferred) : "";
    if (normalizedPreferred && files.has(normalizedPreferred)) {
        return normalizedPreferred;
    }
    const knownEntry = ENTRY_CANDIDATES.find((candidate) => files.has(candidate));
    if (knownEntry) {
        return knownEntry;
    }
    const firstReactFile = Array.from(files.keys()).find((filePath) => /\.(tsx|jsx)$/.test(filePath));
    if (firstReactFile) {
        return firstReactFile;
    }
    throw new Error("Unable to find React entry file. Add main.tsx/main.jsx or provide entryFilePath.");
};
exports.guessEntryFile = guessEntryFile;
const hasExtension = (filePath, extensions) => extensions.some((extension) => filePath.endsWith(extension));
const isAssetPath = (filePath) => hasExtension(filePath, ASSET_EXTENSIONS);
exports.isAssetPath = isAssetPath;
const isStylePath = (filePath) => hasExtension(filePath, STYLE_EXTENSIONS);
exports.isStylePath = isStylePath;
const getEsbuildLoader = (filePath) => {
    if (filePath.endsWith(".tsx"))
        return "tsx";
    if (filePath.endsWith(".ts"))
        return "ts";
    if (filePath.endsWith(".jsx"))
        return "jsx";
    if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs"))
        return "js";
    if (filePath.endsWith(".css"))
        return "css";
    if (filePath.endsWith(".json"))
        return "json";
    return "jsx";
};
exports.getEsbuildLoader = getEsbuildLoader;
const resolveVirtualImport = (importPath, importerPath, files) => {
    if (importPath.startsWith("/")) {
        const normalized = normalizeVirtualPath(importPath);
        if (files.has(normalized)) {
            return normalized;
        }
        const publicBase = normalizeVirtualPath(`/public${importPath}`);
        if (files.has(publicBase)) {
            return publicBase;
        }
        for (const suffix of RESOLUTION_SUFFIXES.slice(1)) {
            const candidate = normalizeVirtualPath(`${importPath}${suffix}`);
            if (files.has(candidate)) {
                return candidate;
            }
            const publicCandidate = normalizeVirtualPath(`/public${importPath}${suffix}`);
            if (files.has(publicCandidate)) {
                return publicCandidate;
            }
        }
        return null;
    }
    const normalizedImporter = normalizeVirtualPath(importerPath);
    const importerDirectory = normalizedImporter.includes("/")
        ? normalizedImporter.slice(0, normalizedImporter.lastIndexOf("/"))
        : "/";
    const rootSegment = normalizedImporter.split("/").filter(Boolean)[0];
    let candidateImportPath = importPath;
    if (rootSegment) {
        const normalizedImport = importPath.replace(/^\.\//, "");
        const rootPrefix = `${rootSegment}/`;
        if (normalizedImport.startsWith(rootPrefix)) {
            candidateImportPath = `./${normalizedImport.slice(rootPrefix.length)}`;
        }
    }
    const basePath = normalizeVirtualPath(`${importerDirectory}/${candidateImportPath}`);
    for (const suffix of RESOLUTION_SUFFIXES) {
        const candidate = suffix ? normalizeVirtualPath(`${basePath}${suffix}`) : basePath;
        if (files.has(candidate)) {
            return candidate;
        }
    }
    if (candidateImportPath !== importPath) {
        const fallbackBase = normalizeVirtualPath(`${importerDirectory}/${importPath}`);
        for (const suffix of RESOLUTION_SUFFIXES) {
            const candidate = suffix ? normalizeVirtualPath(`${fallbackBase}${suffix}`) : fallbackBase;
            if (files.has(candidate)) {
                return candidate;
            }
        }
    }
    return null;
};
exports.resolveVirtualImport = resolveVirtualImport;
const toAssetModuleUrl = (assetBaseUrl, previewId, assetPath) => {
    const normalizedBase = assetBaseUrl.replace(/\/$/, "");
    const encodedPath = encodeURIComponent(assetPath);
    return `${normalizedBase}/api/asset/${previewId}?path=${encodedPath}`;
};
exports.toAssetModuleUrl = toAssetModuleUrl;
