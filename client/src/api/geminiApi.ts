import { GoogleGenAI } from "@google/genai"

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

const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
})

const EMPTY_RESPONSE: CopilotStructuredResponse = {
    action: "generate",
    title: "",
    summary: "",
    code: "",
    explanation: "",
    testCases: [],
}

const ACTION_INSTRUCTIONS: Record<CopilotActionType, string> = {
    generate:
        "Generate production-ready code that directly solves the user request.",
    fix: "Fix bugs and improve correctness of the given file content.",
    explain:
        "Explain what the current code does, including flow, edge cases, and potential issues.",
    tests: "Generate strong test cases for the current code. Include edge cases and at least one hidden test.",
}

const buildPrompt = ({
    action,
    userPrompt,
    fileName,
    fileContent,
}: {
    action: CopilotActionType
    userPrompt: string
    fileName: string
    fileContent: string
}) => `
You are an expert senior software engineer assistant.

Action: ${action}
Action Goal: ${ACTION_INSTRUCTIONS[action]}

User Request:
${userPrompt || "No additional prompt provided."}

Current File Name:
${fileName}

Current File Content:
${fileContent || "(empty)"}

Return ONLY valid JSON in this exact schema:
{
  "action": "generate|fix|explain|tests",
  "title": "short title",
  "summary": "brief summary",
  "code": "full code result or empty string",
  "explanation": "human-readable explanation or empty string",
  "testCases": [
    {
      "input": "stdin input",
      "expectedOutput": "expected stdout",
      "hidden": false
    }
  ]
}

Rules:
- Do not include markdown code fences.
- Keep response strictly JSON.
- For action=tests, fill testCases and leave code optional.
- For action=explain, fill explanation and summary.
- For action=generate or fix, fill code.
`

const extractJsonPayload = (text: string) => {
    const cleanedText = text.trim()

    if (cleanedText.startsWith("{") && cleanedText.endsWith("}")) {
        return cleanedText
    }

    const fencedMatch = cleanedText.match(/```json\s*([\s\S]*?)\s*```/i)
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim()
    }

    const objectMatch = cleanedText.match(/\{[\s\S]*\}/)
    if (objectMatch?.[0]) {
        return objectMatch[0].trim()
    }

    return cleanedText
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
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt({
            action,
            userPrompt,
            fileName,
            fileContent,
        }),
    })

    const raw = response.text || ""
    const payload = extractJsonPayload(raw)

    try {
        const parsed = JSON.parse(payload) as Partial<CopilotStructuredResponse>

        return {
            ...EMPTY_RESPONSE,
            ...parsed,
            action,
            testCases: Array.isArray(parsed.testCases) ? parsed.testCases : [],
        } as CopilotStructuredResponse
    } catch {
        return {
            ...EMPTY_RESPONSE,
            action,
            title: "AI response parsing failed",
            summary: "Received non-JSON output from model.",
            explanation: raw,
            code: "",
            testCases: [],
        }
    }
}

export { runGeminiCopilotAction }
