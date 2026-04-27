"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguageFromFileName = void 0;
const path_1 = __importDefault(require("path"));
const EXTENSION_TO_LANGUAGE = {
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "javascript",
    ".tsx": "typescript",
    ".py": "python",
    ".java": "java",
    ".cpp": "cpp",
    ".c": "c",
    ".cs": "csharp",
    ".go": "go",
    ".rb": "ruby",
    ".php": "php",
    ".rs": "rust",
    ".json": "json",
    ".md": "markdown",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".sql": "sql",
    ".yml": "yaml",
    ".yaml": "yaml",
};
const detectLanguageFromFileName = (fileName) => {
    const extension = path_1.default.extname(fileName).toLowerCase();
    return EXTENSION_TO_LANGUAGE[extension] ?? "plaintext";
};
exports.detectLanguageFromFileName = detectLanguageFromFileName;
