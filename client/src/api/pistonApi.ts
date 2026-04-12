import axios from "axios"

interface FilePayload {
    name: string
    content: string
}

interface RunCodePayload {
    code: string
    language: string
    input?: string
    files?: FilePayload[]
}

interface TestCasePayload {
    id?: string
    input: string
    expectedOutput: string
    hidden?: boolean
}

interface EvaluateCodePayload {
    code: string
    language: string
    mode: "run" | "submit"
    testCases: TestCasePayload[]
    files?: FilePayload[]
}

interface PreviewReactPayload {
    fileTree: {
        name: string
        type: "file" | "directory"
        content?: string
        children?: PreviewReactPayload["fileTree"][]
    }
    entryFilePath?: string
    debug?: boolean
    liveSessionId?: string
}

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000"

const runCodeApi = async ({
    code,
    language,
    input = "",
    files,
}: RunCodePayload) => {
    const response = await axios.post(`${backendBaseUrl}/api/run-code`, {
        code,
        language,
        input,
        files,
    })

    return response.data
}

const evaluateCodeApi = async ({
    code,
    language,
    mode,
    testCases,
    files,
}: EvaluateCodePayload) => {
    const response = await axios.post(`${backendBaseUrl}/api/evaluate-code`, {
        code,
        language,
        mode,
        testCases,
        files,
    })

    return response.data
}

const previewReactApi = async ({
    fileTree,
    entryFilePath,
    debug,
    liveSessionId,
}: PreviewReactPayload) => {
    const response = await axios.post(`${backendBaseUrl}/api/preview-react`, {
        fileTree,
        entryFilePath,
        debug,
        liveSessionId,
    })

    return response.data as {
        html: string
        bundledCode: string
        entryFilePath: string
        previewId: string
        fromCache: boolean
        liveSessionId?: string
        livePreviewUrl?: string
        debugInfo?: {
            entryFilePath: string
            moduleCount: number
            assetCount: number
            resolveAttempts: number
            resolvedImports: number
            failedResolutions: Array<{
                importPath: string
                importer: string
            }>
            externalImports: string[]
        }
    }
}

export { runCodeApi, evaluateCodeApi, previewReactApi }
