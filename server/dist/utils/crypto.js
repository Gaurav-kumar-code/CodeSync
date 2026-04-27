"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = void 0;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const normalizeKey = () => {
    const key = env_1.env.encryptionKey;
    if (key.length === 32) {
        return Buffer.from(key);
    }
    return crypto_1.default.createHash("sha256").update(key).digest();
};
const ivLength = 16;
const encrypt = (text) => {
    const iv = crypto_1.default.randomBytes(ivLength);
    const cipher = crypto_1.default.createCipheriv("aes-256-cbc", normalizeKey(), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
};
exports.encrypt = encrypt;
const decrypt = (text) => {
    const [ivHex, encryptedHex] = text.split(":");
    if (!ivHex || !encryptedHex) {
        throw new Error("Invalid encrypted payload format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto_1.default.createDecipheriv("aes-256-cbc", normalizeKey(), iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
};
exports.decrypt = decrypt;
