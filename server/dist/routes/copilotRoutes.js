"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const copilotController_1 = require("../controllers/copilotController");
const copilotRoutes = (0, express_1.Router)();
copilotRoutes.post("/", copilotController_1.runCopilotActionController);
exports.default = copilotRoutes;
