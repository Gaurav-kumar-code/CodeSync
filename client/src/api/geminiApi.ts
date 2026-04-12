export type CopilotActionType = "generate" | "fix" | "explain" | "tests"

export interface GeneratedTestCase {
    input: string
    expectedOutput: string
    hidden?: boolean
}

export interface CopilotStructuredResponse {
    action: CopilotActionType
    title: string
    summary: string
    code: string
    explanation: string
    testCases: GeneratedTestCase[]
}

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

const EMPTY_RESPONSE: CopilotStructuredResponse = {
    action: "generate",
    title: "",
    summary: "",
    code: "",
    explanation: "",
    testCases: [],
}

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
}) => {
    try {
        const response = await fetch(`${backendBaseUrl}/api/copilot`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action,
                userPrompt,
                fileName,
                fileContent,
            }),
        })

        if (!response.ok) {
            const payload = await response
                .json()
                .catch(() => ({ error: "Unknown backend error" }))

            return {
                ...EMPTY_RESPONSE,
                action,
                title: "API Error",
                summary: payload?.error || "Failed to call Copilot API",
                explanation: payload?.details || "Backend request failed",
                code: "",
                testCases: [],
            }
        }

        const parsed = (await response.json()) as Partial<CopilotStructuredResponse>

        return {
            ...EMPTY_RESPONSE,
            ...parsed,
            action,
            testCases: Array.isArray(parsed.testCases)
                ? parsed.testCases
                : [],
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
