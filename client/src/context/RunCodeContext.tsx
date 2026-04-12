import { evaluateCodeApi, previewReactApi, runCodeApi } from "@/api/pistonApi"
import {
    Language,
    RunContext as RunContextType,
    TestCase,
} from "@/types/run"
import { getFilePathById } from "@/utils/file"
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import toast from "react-hot-toast"
import { v4 as uuidv4 } from "uuid"
import { useFileSystem } from "./FileContext"

const RunCodeContext = createContext<RunContextType | null>(null)

const SUPPORTED_LANGUAGES: Language[] = [
    { language: "python", version: "", aliases: ["py", "python"] },
    {
        language: "javascript",
        version: "",
        aliases: ["js", "javascript", "mjs", "cjs"],
    },
    { language: "java", version: "", aliases: ["java"] },
    { language: "cpp", version: "", aliases: ["cpp", "cc", "cxx"] },
    { language: "html", version: "", aliases: ["html", "htm"] },
    { language: "react", version: "", aliases: ["jsx", "tsx", "react"] },
    { language: "vue", version: "", aliases: ["vue"] },
    {
        language: "angular",
        version: "",
        aliases: ["angular", "ng", "ts"],
    },
]

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

const getInitialTestCase = (): TestCase => ({
    id: uuidv4(),
    input: "",
    expectedOutput: "",
    hidden: false,
})

export const useRunCode = () => {
    const context = useContext(RunCodeContext)
    if (context === null) {
        throw new Error(
            "useRunCode must be used within a RunCodeContextProvider",
        )
    }
    return context
}

const RunCodeContextProvider = ({ children }: { children: ReactNode }) => {
    const { activeFile, fileStructure } = useFileSystem()

    const [input, setInput] = useState<string>("")
    const [output, setOutput] = useState<string>("")
    const [previewOutput, setPreviewOutput] = useState<string>("")
    const [previewBrowserUrl, setPreviewBrowserUrl] = useState<string>("")
    const [previewError, setPreviewError] = useState<string>("")
    const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false)
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [isEvaluating, setIsEvaluating] = useState<boolean>(false)
    const [testCases, setTestCases] = useState<TestCase[]>([getInitialTestCase()])
    const [evaluationResult, setEvaluationResult] = useState<RunContextType["evaluationResult"]>(null)
    const [activeTab, setActiveTab] = useState<RunContextType["activeTab"]>("run")
    const livePreviewSessionIdRef = useRef(`preview_${uuidv4().replace(/-/g, "")}`)

    const supportedLanguages = SUPPORTED_LANGUAGES

    const [selectedLanguage, setSelectedLanguage] = useState<Language>({
        language: "",
        version: "",
        aliases: [],
    })

    const canPreview =
        selectedLanguage.language === "html" ||
        selectedLanguage.language === "react"

    const finalCode = useMemo(() => {
        if (!activeFile?.content) return ""

        if (selectedLanguage.language !== "javascript") {
            return activeFile.content
        }

        return `
const input = \`${input}\`;
const n = parseInt(input);

// USER CODE
${activeFile.content}

// AUTO EXECUTION
try {
    if (typeof fibonacci === "function") {
        console.log(fibonacci(n));
    }
} catch (e) {
    console.log("Error:", e.message);
}
`
    }, [activeFile?.content, input, selectedLanguage.language])

    const files = useMemo(() => {
        if (!selectedLanguage.language) return []

        return [
            {
                name: FILE_MAP[selectedLanguage.language] || "main.txt",
                content: finalCode,
            },
        ]
    }, [finalCode, selectedLanguage.language])

    // Detect language from file extension
    useEffect(() => {
        if (!activeFile?.name) return

        const extension = activeFile.name.split(".").pop()

        const language = supportedLanguages.find((lang) =>
            lang.aliases.includes(extension || "")
        )

        if (language) {
            setSelectedLanguage(language)
        } else {
            setSelectedLanguage({ language: "", version: "", aliases: [] })
        }
    }, [activeFile?.name, supportedLanguages])

    useEffect(() => {
        if (!canPreview || !activeFile?.content) {
            setPreviewOutput("")
            setPreviewBrowserUrl("")
            setPreviewError("")
            return
        }

        if (selectedLanguage.language === "html") {
            setPreviewOutput(activeFile.content)
            setPreviewBrowserUrl("")
            setPreviewError("")
            setIsPreviewLoading(false)
            return
        }

        let cancelled = false
        setIsPreviewLoading(true)

        const timer = window.setTimeout(async () => {
            try {
                const activeFilePath = getFilePathById(fileStructure, activeFile.id)
                const preview = await previewReactApi({
                    fileTree: fileStructure,
                    entryFilePath: activeFilePath || undefined,
                    debug: true,
                    liveSessionId: livePreviewSessionIdRef.current,
                })

                if (cancelled) {
                    return
                }

                setPreviewOutput(preview.html)
                setPreviewBrowserUrl(preview.livePreviewUrl || "")
                setPreviewError("")
            } catch (error: any) {
                if (cancelled) {
                    return
                }

                setPreviewOutput("")
                const isNetworkError =
                    !error?.response &&
                    typeof error?.message === "string" &&
                    error.message.toLowerCase().includes("network")

                const debugDetails = error?.response?.data?.details
                const failedResolutions = Array.isArray(debugDetails?.failedResolutions)
                    ? debugDetails.failedResolutions
                    : []

                const failedResolutionSummary = failedResolutions.length
                    ? `\n\nFailed imports:\n${failedResolutions
                          .slice(0, 8)
                          .map(
                              (entry: { importPath: string; importer: string }) =>
                                  `- ${entry.importPath} from ${entry.importer}`,
                          )
                          .join("\n")}`
                    : ""

                const contextSummary = debugDetails?.entryFilePath
                    ? `\n\nEntry: ${debugDetails.entryFilePath}\nModules: ${debugDetails.moduleCount}\nAssets: ${debugDetails.assetCount}`
                    : ""

                setPreviewError(
                    isNetworkError
                        ? "Network error while generating preview. Make sure backend is running at http://localhost:3000"
                        : `${
                              error?.response?.data?.error ||
                              error?.message ||
                              "Failed to generate React preview"
                          }${contextSummary}${failedResolutionSummary}`,
                )
            } finally {
                if (!cancelled) {
                    setIsPreviewLoading(false)
                }
            }
        }, 400)

        return () => {
            cancelled = true
            window.clearTimeout(timer)
        }
    }, [
        activeFile?.content,
        activeFile?.id,
        canPreview,
        fileStructure,
        selectedLanguage.language,
    ])

    const addTestCase = () => {
        setTestCases((previousCases) => [...previousCases, getInitialTestCase()])
    }

    const updateTestCase = (
        id: string,
        field: "input" | "expectedOutput" | "hidden",
        value: string | boolean,
    ) => {
        setTestCases((previousCases) =>
            previousCases.map((testCase) =>
                testCase.id === id ? { ...testCase, [field]: value } : testCase,
            ),
        )
    }

    const removeTestCase = (id: string) => {
        setTestCases((previousCases) => {
            const updated = previousCases.filter((testCase) => testCase.id !== id)
            return updated.length > 0 ? updated : [getInitialTestCase()]
        })
    }

    const hydrateTestCases = (
        generatedCases: Array<{
            input: string
            expectedOutput: string
            hidden?: boolean
        }>,
    ) => {
        if (!generatedCases.length) {
            return
        }

        setTestCases(
            generatedCases.map((generatedCase) => ({
                id: uuidv4(),
                input: generatedCase.input,
                expectedOutput: generatedCase.expectedOutput,
                hidden: Boolean(generatedCase.hidden),
            })),
        )
        setActiveTab("testCases")
    }

    // Run Code (OneCompiler API)
    const runCode = async () => {
        try {
            if (!selectedLanguage.language) {
                toast.error("Please select a language")
                return
            }

            if (!activeFile) {
                toast.error("Please open a file")
                return
            }

            toast.loading("Running code...")
            setIsRunning(true)

            const data = await runCodeApi({
                code: finalCode,
                language: selectedLanguage.language,
                input,
                files,
            })

            if (data.url) {
                setOutput(data.url)
            } else if (data.stdout) {
                setOutput(data.stdout)
            } else if (data.stderr) {
                setOutput(data.stderr)
            } else if (data.exception) {
                setOutput(data.exception)
            } else if (data.error) {
                setOutput(data.error)
            } else {
                setOutput("No output")
            }

            setIsRunning(false)
            toast.dismiss()
        } catch (error: any) {
            console.error(error?.response?.data || error.message)
            setIsRunning(false)
            toast.dismiss()
            toast.error("Failed to run code")
        }
    }

    const runAgainstTestCases = async (mode: "run" | "submit") => {
        try {
            if (!activeFile) {
                toast.error("Please open a file")
                return
            }

            if (!selectedLanguage.language) {
                toast.error("Please select a language")
                return
            }

            if (!testCases.length) {
                toast.error("Please add at least one test case")
                return
            }

            toast.loading(mode === "run" ? "Running test cases..." : "Submitting...")
            setIsEvaluating(true)

            const result = await evaluateCodeApi({
                code: finalCode,
                language: selectedLanguage.language,
                mode,
                testCases,
                files,
            })

            setEvaluationResult(result)
            toast.dismiss()
            toast.success(
                result.verdict === "Passed"
                    ? `All test cases passed (${result.passedCount}/${result.totalCount})`
                    : `Passed ${result.passedCount}/${result.totalCount} test cases`,
            )
        } catch (error: any) {
            console.error(error?.response?.data || error.message)
            toast.dismiss()
            toast.error("Failed to evaluate test cases")
        } finally {
            setIsEvaluating(false)
        }
    }

    return (
        <RunCodeContext.Provider
            value={{
                input,
                setInput,
                output,
                previewOutput,
                previewBrowserUrl,
                previewError,
                isPreviewLoading,
                isRunning,
                isEvaluating,
                supportedLanguages,
                selectedLanguage,
                setSelectedLanguage,
                runCode,
                testCases,
                setTestCases,
                addTestCase,
                updateTestCase,
                removeTestCase,
                runAgainstTestCases,
                evaluationResult,
                activeTab,
                setActiveTab,
                canPreview,
                hydrateTestCases,
            }}
        >
            {children}
        </RunCodeContext.Provider>
    )
}

export { RunCodeContextProvider }
export default RunCodeContext