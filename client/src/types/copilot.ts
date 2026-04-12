import { GeneratedTestCase, CopilotActionType } from "@/api/geminiApi"

interface CopilotStructuredOutput {
    action: CopilotActionType
    title: string
    summary: string
    code: string
    explanation: string
    testCases: GeneratedTestCase[]
}

export interface ICopilotContext {
    input: string
    setInput: (input: string) => void
    output: string
    isRunning: boolean
    generateCode: () => void
    fixCode: () => void
    explainCode: () => void
    generateTestCases: () => void
    latestResult: CopilotStructuredOutput | null
}
