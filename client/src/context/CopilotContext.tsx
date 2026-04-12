import { ICopilotContext } from "@/types/copilot"
import { CopilotActionType, runGeminiCopilotAction } from "@/api/geminiApi"
import { createContext, ReactNode, useContext, useState } from "react"
import toast from "react-hot-toast"
import { useFileSystem } from "./FileContext"

const CopilotContext = createContext<ICopilotContext | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useCopilot = () => {
    const context = useContext(CopilotContext)
    if (context === null) {
        throw new Error(
            "useCopilot must be used within a CopilotContextProvider",
        )
    }
    return context
}

const CopilotContextProvider = ({ children }: { children: ReactNode }) => {
    const { activeFile } = useFileSystem()
    const [input, setInput] = useState<string>("")
    const [output, setOutput] = useState<string>("")
    const [isRunning, setIsRunning] = useState<boolean>(false)
    const [latestResult, setLatestResult] = useState<ICopilotContext["latestResult"]>(null)

    const executeAction = async (action: CopilotActionType) => {
        try {
            if (!import.meta.env.VITE_GEMINI_API_KEY) {
                toast.error("Missing Gemini API key")
                return
            }

            if (!activeFile) {
                toast.error("Open a file to use Copilot actions")
                return
            }

            if (!input.trim() && action === "generate") {
                toast.error("Please write a prompt")
                return
            }

            toast.loading("Running AI action...")
            setIsRunning(true)

            const result = await runGeminiCopilotAction({
                action,
                userPrompt: input,
                fileName: activeFile.name,
                fileContent: activeFile.content || "",
            })

            setLatestResult(result)

            const displayOutput =
                result.code ||
                result.explanation ||
                JSON.stringify(result.testCases, null, 2) ||
                result.summary

            setOutput(displayOutput)
            toast.dismiss()
            toast.success("AI action completed")
        } catch (error) {
            console.error(error)
            toast.dismiss()
            toast.error("Failed to generate the code")
        } finally {
            setIsRunning(false)
        }
    }

    const generateCode = async () => {
        await executeAction("generate")
    }

    const fixCode = async () => {
        await executeAction("fix")
    }

    const explainCode = async () => {
        await executeAction("explain")
    }

    const generateTestCases = async () => {
        await executeAction("tests")
    }

    return (
        <CopilotContext.Provider
            value={{
                input,
                setInput,
                output,
                isRunning,
                generateCode,
                fixCode,
                explainCode,
                generateTestCases,
                latestResult,
            }}
        >
            {children}
        </CopilotContext.Provider>
    )
}

export { CopilotContextProvider }
export default CopilotContext
