export type CopilotActionType = "generate" | "fix" | "explain" | "tests"

export interface CopilotRequestBody {
    action: CopilotActionType
    userPrompt: string
    fileName: string
    fileContent: string
}

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
