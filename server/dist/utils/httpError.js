"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHttpError = exports.HttpError = void 0;
class HttpError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.HttpError = HttpError;
const isHttpError = (value) => {
    return value instanceof HttpError;
};
exports.isHttpError = isHttpError;
