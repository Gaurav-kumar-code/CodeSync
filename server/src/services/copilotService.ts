import { GoogleGenAI } from "@google/genai"
import {
    CopilotActionType,
    CopilotStructuredResponse,
} from "../types/copilot"
import {
    EMPTY_RESPONSE,
    buildPrompt,
    extractJsonPayload,
    normalizeCopilotResponse,
} from "./copilotPromptService"

const GEMINI_MODEL = "gemini-2.5-flash-lite"

const runGeminiCopilotAction = async ({
    action,
    userPrompt,
    fileName,
    fileContent,
}: {
    action: CopilotActionType
    userPrompt: string
    fileName: string
    fileContent: string
}): Promise<CopilotStructuredResponse> => {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        return {
            ...EMPTY_RESPONSE,
            action,
            title: "Configuration Error",
            summary: "Missing GEMINI_API_KEY in server environment",
            explanation: "Set GEMINI_API_KEY in server .env before using Copilot",
            code: "",
            testCases: [],
        }
    }

    const ai = new GoogleGenAI({ apiKey })

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: buildPrompt({
                action,
                userPrompt,
                fileName,
                fileContent,
            }),
            config: {
                temperature: 0.3,
            },
        })

        const raw = response.text || ""
        const payload = extractJsonPayload(raw)

        try {
            const parsed = JSON.parse(payload) as Partial<CopilotStructuredResponse>
            return normalizeCopilotResponse({ action, parsed })
        } catch (jsonError) {
            console.error("Copilot JSON parse failed:", jsonError)

            return {
                ...EMPTY_RESPONSE,
                action,
                title: "Invalid JSON from AI",
                summary: "Model returned malformed JSON",
                explanation: raw,
                code: "",
                testCases: [],
            }
        }
    } catch (error: any) {
        console.error("Gemini API Error:", error)

        return {
            ...EMPTY_RESPONSE,
            action,
            title: "API Error",
            summary: "Failed to fetch response from Gemini",
            explanation: error?.message || "Unknown error",
            code: "",
            testCases: [],
        }
    }
}

export { runGeminiCopilotAction }
