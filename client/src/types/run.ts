interface Language {
    language: string
    version: string
    aliases: string[]
}

interface TestCase {
    id: string
    input: string
    expectedOutput: string
    hidden: boolean
}

interface TestCaseResult {
    id: string
    input: string
    expectedOutput: string
    actualOutput: string
    passed: boolean
    hidden: boolean
    error?: string
}

interface EvaluationResult {
    mode: "run" | "submit"
    verdict: "Passed" | "Failed"
    passedCount: number
    totalCount: number
    results: TestCaseResult[]
}

type RunPanelTab = "run" | "testCases" | "preview"

interface RunContext {
    input: string
    setInput: (input: string) => void
    output: string
    previewOutput: string
    previewBrowserUrl: string
    previewError: string
    isPreviewLoading: boolean
    isRunning: boolean
    isEvaluating: boolean
    supportedLanguages: Language[]
    selectedLanguage: Language
    setSelectedLanguage: (language: Language) => void
    runCode: () => void
    testCases: TestCase[]
    setTestCases: (testCases: TestCase[]) => void
    addTestCase: () => void
    updateTestCase: (
        id: string,
        field: "input" | "expectedOutput" | "hidden",
        value: string | boolean,
    ) => void
    removeTestCase: (id: string) => void
    runAgainstTestCases: (mode: "run" | "submit") => Promise<void>
    evaluationResult: EvaluationResult | null
    activeTab: RunPanelTab
    setActiveTab: (tab: RunPanelTab) => void
    canPreview: boolean
    hydrateTestCases: (
        testCases: Array<{
            input: string
            expectedOutput: string
            hidden?: boolean
        }>,
    ) => void
}

export {
    Language,
    TestCase,
    TestCaseResult,
    EvaluationResult,
    RunPanelTab,
    RunContext,
}
