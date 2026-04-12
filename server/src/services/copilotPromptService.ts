import {
    CopilotActionType,
    CopilotStructuredResponse,
} from "../types/copilot"

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

const normalizeCopilotResponse = ({
    action,
    parsed,
}: {
    action: CopilotActionType
    parsed: Partial<CopilotStructuredResponse>
}): CopilotStructuredResponse => {
    return {
        ...EMPTY_RESPONSE,
        ...parsed,
        action,
        testCases: Array.isArray(parsed.testCases) ? parsed.testCases : [],
    }
}

export {
    ACTION_INSTRUCTIONS,
    EMPTY_RESPONSE,
    buildPrompt,
    extractJsonPayload,
    normalizeCopilotResponse,
}
