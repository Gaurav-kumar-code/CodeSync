import axios from "axios"

export type ExecutionLanguage =
    | "python"
    | "javascript"
    | "java"
    | "cpp"
    | "html"
    | "react"
    | "vue"
    | "angular"

export interface TestCase {
    id?: string
    input: string
    expectedOutput: string
    hidden?: boolean
}

export interface EvaluateCodePayload {
    code: string
    language: string
    testCases: TestCase[]
    mode: "run" | "submit"
    files?: Array<{ name: string; content: string }>
}

export interface TestCaseResult {
    id: string
    input: string
    expectedOutput: string
    actualOutput: string
    passed: boolean
    hidden: boolean
    error?: string
}

const FILE_MAP: Record<string, string> = {
    python: "main.py",
    javascript: "index.js",
    java: "Main.java",
    cpp: "main.cpp",
    html: "index.html",
    react: "App.js",
    vue: "App.vue",
    angular: "main.ts",
}

const normalizeOutput = (value: string) =>
    value
        .replace(/\r\n/g, "\n")
        .trim()

const getExecutionOutput = (data: any): string => {
    if (data?.stdout) return String(data.stdout)
    if (data?.stderr) return String(data.stderr)
    if (data?.exception) return String(data.exception)
    if (data?.error) return String(data.error)
    return ""
}

export const buildFilesPayload = (
    language: string,
    code: string,
    files?: Array<{ name: string; content: string }>,
) => {
    if (files && files.length > 0) {
        return files
    }

    return [
        {
            name: FILE_MAP[language] || "main.txt",
            content: code,
        },
    ]
}

export const runOneCompiler = async ({
    code,
    language,
    input,
    files,
}: {
    code: string
    language: string
    input?: string
    files?: Array<{ name: string; content: string }>
}) => {
    const response = await axios.post(
        "https://api.onecompiler.com/v1/run",
        {
            language,
            stdin: input || "",
            files: buildFilesPayload(language, code, files),
        },
        {
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": process.env.ONECOMPILER_API_KEY,
            },
        },
    )

    return response.data
}

export const evaluateAgainstTestCases = async ({
    code,
    language,
    testCases,
    mode,
    files,
}: EvaluateCodePayload) => {
    const selectedCases =
        mode === "submit"
            ? testCases
            : testCases.filter((testCase) => !testCase.hidden)

    const runnableCases = selectedCases.length > 0 ? selectedCases : testCases

    const results = await Promise.all(
        runnableCases.map(async (testCase, index) => {
            try {
                const executionResult = await runOneCompiler({
                    code,
                    language,
                    input: testCase.input,
                    files,
                })

                const actualOutput = normalizeOutput(
                    getExecutionOutput(executionResult),
                )
                const expectedOutput = normalizeOutput(testCase.expectedOutput)
                const passed = actualOutput === expectedOutput
                const isHidden = Boolean(testCase.hidden)

                return {
                    id: testCase.id || `case-${index + 1}`,
                    input:
                        isHidden && mode === "submit"
                            ? "[hidden]"
                            : testCase.input,
                    expectedOutput:
                        isHidden && mode === "submit"
                            ? "[hidden]"
                            : testCase.expectedOutput,
                    actualOutput,
                    passed,
                    hidden: isHidden,
                } satisfies TestCaseResult
            } catch (error: any) {
                return {
                    id: testCase.id || `case-${index + 1}`,
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: "",
                    passed: false,
                    hidden: Boolean(testCase.hidden),
                    error:
                        error?.response?.data?.message ||
                        error?.response?.data?.error ||
                        error?.message ||
                        "Execution failed",
                } satisfies TestCaseResult
            }
        }),
    )

    const passedCount = results.filter((result) => result.passed).length

    return {
        mode,
        verdict: passedCount === results.length ? "Passed" : "Failed",
        passedCount,
        totalCount: results.length,
        results,
    }
}
