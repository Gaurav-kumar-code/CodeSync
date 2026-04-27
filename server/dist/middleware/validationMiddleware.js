"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (errors.isEmpty()) {
        return next();
    }
    return res.status(422).json({
        message: "Validation failed",
        errors: errors.array().map((error) => ({
            field: "path" in error ? error.path : "unknown",
            message: error.msg,
            value: "value" in error ? error.value : undefined,
        })),
    });
};
exports.validateRequest = validateRequest;
