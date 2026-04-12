"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGeminiCopilotAction = void 0;
const genai_1 = require("@google/genai");
const copilotPromptService_1 = require("./copilotPromptService");
const GEMINI_MODEL = "gemini-2.5-flash-lite";
const runGeminiCopilotAction = async ({ action, userPrompt, fileName, fileContent, }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            ...copilotPromptService_1.EMPTY_RESPONSE,
            action,
            title: "Configuration Error",
            summary: "Missing GEMINI_API_KEY in server environment",
            explanation: "Set GEMINI_API_KEY in server .env before using Copilot",
            code: "",
            testCases: [],
        };
    }
    const ai = new genai_1.GoogleGenAI({ apiKey });
    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: (0, copilotPromptService_1.buildPrompt)({
                action,
                userPrompt,
                fileName,
                fileContent,
            }),
            config: {
                temperature: 0.3,
            },
        });
        const raw = response.text || "";
        const payload = (0, copilotPromptService_1.extractJsonPayload)(raw);
        try {
            const parsed = JSON.parse(payload);
            return (0, copilotPromptService_1.normalizeCopilotResponse)({ action, parsed });
        }
        catch (jsonError) {
            console.error("Copilot JSON parse failed:", jsonError);
            return {
                ...copilotPromptService_1.EMPTY_RESPONSE,
                action,
                title: "Invalid JSON from AI",
                summary: "Model returned malformed JSON",
                explanation: raw,
                code: "",
                testCases: [],
            };
        }
    }
    catch (error) {
        console.error("Gemini API Error:", error);
        return {
            ...copilotPromptService_1.EMPTY_RESPONSE,
            action,
            title: "API Error",
            summary: "Failed to fetch response from Gemini",
            explanation: error?.message || "Unknown error",
            code: "",
            testCases: [],
        };
    }
};
exports.runGeminiCopilotAction = runGeminiCopilotAction;
