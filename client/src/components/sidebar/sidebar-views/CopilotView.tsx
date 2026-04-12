import { useCopilot } from "@/context/CopilotContext"
import { useFileSystem } from "@/context/FileContext"
import { useRunCode } from "@/context/RunCodeContext"
import { useSocket } from "@/context/SocketContext"
import useResponsive from "@/hooks/useResponsive"
import { SocketEvent } from "@/types/socket"
import toast from "react-hot-toast"
import {
    LuClipboardPaste,
    LuCopy,
    LuListChecks,
    LuRepeat,
    LuSparkles,
} from "react-icons/lu"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"

function CopilotView() {
    const {socket} = useSocket()
    const { viewHeight } = useResponsive()
    const {
        generateCode,
        fixCode,
        explainCode,
        generateTestCases,
        latestResult,
        output,
        isRunning,
        setInput,
    } = useCopilot()
    const { hydrateTestCases } = useRunCode()
    const { activeFile, updateFileContent, setActiveFile } = useFileSystem()

    const copyOutput = async () => {
        try {
            const content = output.replace(/```[\w]*\n?/g, "").trim()
            await navigator.clipboard.writeText(content)
            toast.success("Output copied to clipboard")
        } catch (error) {
            toast.error("Unable to copy output to clipboard")
            console.log(error)
        }
    }

    const pasteCodeInFile = () => {
        if (activeFile) {
            const fileContent = activeFile.content
                ? `${activeFile.content}\n`
                : ""
            const content = `${fileContent}${output.replace(/```[\w]*\n?/g, "").trim()}`
            updateFileContent(activeFile.id, content)
            // Update the content of the active file if it's the same file
            setActiveFile({ ...activeFile, content })
            toast.success("Code pasted successfully")
            // Emit the FILE_UPDATED event to the server
            socket.emit(SocketEvent.FILE_UPDATED, {
                fileId: activeFile.id,
                newContent: content,
            })
        }
    }

    const replaceCodeInFile = () => {
        if (activeFile) {
            const isConfirmed = confirm(
                `Are you sure you want to replace the code in the file?`,
            )
            if (!isConfirmed) return
            const content = output.replace(/```[\w]*\n?/g, "").trim()
            updateFileContent(activeFile.id, content)
            // Update the content of the active file if it's the same file
            setActiveFile({ ...activeFile, content })
            toast.success("Code replaced successfully")
            // Emit the FILE_UPDATED event to the server
            socket.emit(SocketEvent.FILE_UPDATED, {
                fileId: activeFile.id,
                newContent: content,
            })
        }
    }

    const applyGeneratedTests = () => {
        if (!latestResult?.testCases?.length) {
            toast.error("No generated test cases found")
            return
        }

        hydrateTestCases(latestResult.testCases)
        toast.success("Generated test cases imported")
    }

    return (
        <div
            className="flex max-h-full min-h-[400px] w-full flex-col gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Copilot</h1>
            <textarea
                className="min-h-[120px] w-full rounded-md border-none bg-darkHover p-2 text-white outline-none"
                placeholder="What code do you want to generate?"
                onChange={(e) => setInput(e.target.value)}
            />
            <button
                className="mt-1 flex w-full justify-center rounded-md bg-primary p-2 font-bold text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
                onClick={generateCode}
                disabled={isRunning}
            >
                {isRunning ? "Generating..." : "Generate Code"}
            </button>
            <div className="grid w-full grid-cols-3 gap-2">
                <button
                    className="rounded-md border border-blue-400/70 bg-blue-500/20 px-2 py-2 text-xs font-semibold text-blue-200 disabled:opacity-50"
                    onClick={fixCode}
                    disabled={isRunning}
                >
                    Fix Code
                </button>
                <button
                    className="rounded-md border border-violet-400/70 bg-violet-500/20 px-2 py-2 text-xs font-semibold text-violet-200 disabled:opacity-50"
                    onClick={explainCode}
                    disabled={isRunning}
                >
                    Explain Code
                </button>
                <button
                    className="rounded-md border border-emerald-400/70 bg-emerald-500/20 px-2 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50"
                    onClick={generateTestCases}
                    disabled={isRunning}
                >
                    Generate Tests
                </button>
            </div>
            {latestResult?.testCases?.length ? (
                <button
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/70 bg-darkHover px-2 py-2 text-sm font-semibold text-primary"
                    onClick={applyGeneratedTests}
                >
                    <LuListChecks size={16} /> Use Generated Test Cases
                </button>
            ) : null}
            {output && (
                <div className="flex justify-end gap-4 pt-2">
                    <button title="AI Action Completed">
                        <LuSparkles
                            size={18}
                            className="cursor-default text-primary"
                        />
                    </button>
                    <button title="Copy Output" onClick={copyOutput}>
                        <LuCopy
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                    <button
                        title="Replace code in file"
                        onClick={replaceCodeInFile}
                    >
                        <LuRepeat
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                    <button
                        title="Paste code in file"
                        onClick={pasteCodeInFile}
                    >
                        <LuClipboardPaste
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                </div>
            )}
            <div className="h-full rounded-lg w-full overflow-y-auto p-0">
                <ReactMarkdown
                    components={{
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        code({ inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "")
                            const language = match ? match[1] : "javascript" // Default to JS

                            return !inline ? (
                                <SyntaxHighlighter
                                    style={dracula}
                                    language={language}
                                    PreTag="pre"
                                    className="!m-0 !h-full !rounded-lg !bg-gray-900 !p-2"
                                >
                                    {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                            ) : (
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            )
                        },
                        pre({ children }) {
                            return <pre className="h-full">{children}</pre>
                        },
                    }}
                >
                    {output}
                </ReactMarkdown>
            </div>
        </div>
    )
}

export default CopilotView
