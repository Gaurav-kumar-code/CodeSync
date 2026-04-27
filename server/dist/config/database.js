"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
let isConnected = false;
const connectDatabase = async () => {
    if (isConnected) {
        return mongoose_1.default.connection;
    }
    await mongoose_1.default.connect(env_1.env.mongoUri, {
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000,
    });
    isConnected = true;
    mongoose_1.default.connection.on("error", (error) => {
        console.error("MongoDB error:", error);
    });
    mongoose_1.default.connection.on("disconnected", () => {
        isConnected = false;
    });
    return mongoose_1.default.connection;
};
exports.connectDatabase = connectDatabase;
