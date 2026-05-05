import { useRunCode } from "@/context/RunCodeContext"
import useResponsive from "@/hooks/useResponsive"
import { ChangeEvent } from "react"
import toast from "react-hot-toast"
import { LuCheck, LuCopy, LuPlus, LuTrash2, LuX } from "react-icons/lu"
import { PiCaretDownBold } from "react-icons/pi"

function RunView() {
    const { viewHeight } = useResponsive()
    const {
        input,
        setInput,
        output,
        previewOutput,
        previewBrowserUrl,
        previewError,
        isPreviewLoading,
        canPreview,
        isRunning,
        isEvaluating,
        supportedLanguages,
        selectedLanguage,
        setSelectedLanguage,
        runCode,
        testCases,
        addTestCase,
        updateTestCase,
        removeTestCase,
        runAgainstTestCases,
        evaluationResult,
        activeTab,
        setActiveTab,
    } = useRunCode()

    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const lang = JSON.parse(e.target.value)
        setSelectedLanguage(lang)
    }

    const copyOutput = () => {
        navigator.clipboard.writeText(output)
        toast.success("Output copied to clipboard")
    }

    const copyPreviewContent = () => {
        navigator.clipboard.writeText(previewOutput)
        toast.success("Preview source copied")
    }

    const copyPreviewLink = () => {
        if (!previewBrowserUrl) return
        navigator.clipboard.writeText(previewBrowserUrl)
        toast.success("Live preview link copied")
    }

    const openPreviewInBrowser = () => {
        if (!previewBrowserUrl) return
        window.open(previewBrowserUrl, "_blank", "noopener,noreferrer")
    }

    const isPreviewUrl = /^https?:\/\//i.test(output.trim())

    return (
        <div
            className="flex flex-col items-center gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Run Code</h1>
            <div className="flex h-[90%] w-full flex-col gap-2 md:h-[92%]">
                <div className="grid grid-cols-3 gap-2 rounded-md bg-darkHover p-1">
                    <button
                        className={`rounded-md px-2 py-1 text-sm font-semibold transition ${
                            activeTab === "run"
                                ? "bg-primary text-black"
                                : "text-white hover:bg-dark"
                        }`}
                        onClick={() => setActiveTab("run")}
                    >
                        Run
                    </button>
                    <button
                        className={`rounded-md px-2 py-1 text-sm font-semibold transition ${
                            activeTab === "testCases"
                                ? "bg-primary text-black"
                                : "text-white hover:bg-dark"
                        }`}
                        onClick={() => setActiveTab("testCases")}
                    >
                        Test Cases
                    </button>
                    <button
                        className={`rounded-md px-2 py-1 text-sm font-semibold transition ${
                            activeTab === "preview"
                                ? "bg-primary text-black"
                                : "text-white hover:bg-dark"
                        }`}
                        onClick={() => setActiveTab("preview")}
                    >
                        Preview
                    </button>
                </div>

                {activeTab === "run" && (
                    <>
                <div className="relative w-full">
                    <select
                        aria-label="Select language"
                        title="Select language"
                        className="w-full rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none"
                        value={JSON.stringify(selectedLanguage)}
                        onChange={handleLanguageChange}
                    >
                        {supportedLanguages
                            .sort((a, b) => (a.language > b.language ? 1 : -1))
                            .map((lang, i) => {
                                return (
                                    <option
                                        key={i}
                                        value={JSON.stringify(lang)}
                                    >
                                        {lang.language +
                                            (lang.version
                                                ? ` (${lang.version})`
                                                : "")}
                                    </option>
                                )
                            })}
                    </select>
                    <PiCaretDownBold
                        size={16}
                        className="absolute bottom-3 right-4 z-10 text-white"
                    />
                </div>
                <textarea
                    className="min-h-[120px] w-full resize-none rounded-md border-none bg-darkHover p-2 text-white outline-none"
                    placeholder="Write you input here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <div className="grid w-full grid-cols-2 gap-2">
                    <button
                        className="flex w-full justify-center rounded-md bg-primary p-2 font-bold text-black outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={runCode}
                        disabled={isRunning}
                    >
                        {isRunning ? "Running..." : "Run Code"}
                    </button>
                    <button
                        className="flex w-full justify-center rounded-md border border-primary/70 bg-dark p-2 font-bold text-primary outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => runAgainstTestCases("run")}
                        disabled={isEvaluating}
                    >
                        {isEvaluating ? "Running Tests..." : "Run Tests"}
                    </button>
                </div>
                <label className="flex w-full justify-between">
                    Output :
                    <button onClick={copyOutput} title="Copy Output">
                        <LuCopy
                            size={18}
                            className="cursor-pointer text-white"
                        />
                    </button>
                </label>
                <div className="w-full flex-grow resize-none overflow-y-auto rounded-md border-none bg-darkHover p-2 text-white outline-none">
                    {isPreviewUrl ? (
                        <iframe
                            src={output.trim()}
                            title="Web preview"
                            className="h-full min-h-[280px] w-full rounded-md border-0 bg-white"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    ) : (
                        <code>
                            <pre className="text-wrap">{output}</pre>
                        </code>
                    )}
                </div>
                    </>
                )}

                {activeTab === "testCases" && (
                    <div className="flex h-full flex-col gap-2 overflow-hidden">
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                className="rounded-md bg-primary px-3 py-2 text-sm font-bold text-black"
                                onClick={addTestCase}
                            >
                                <span className="inline-flex items-center gap-1">
                                    <LuPlus size={16} /> Add
                                </span>
                            </button>
                            <button
                                className="rounded-md border border-primary bg-dark px-3 py-2 text-sm font-bold text-primary disabled:opacity-50"
                                onClick={() => runAgainstTestCases("run")}
                                disabled={isEvaluating}
                            >
                                Run
                            </button>
                            <button
                                className="rounded-md border border-emerald-400 bg-emerald-500/20 px-3 py-2 text-sm font-bold text-emerald-300 disabled:opacity-50"
                                onClick={() => runAgainstTestCases("submit")}
                                disabled={isEvaluating}
                            >
                                Submit
                            </button>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                            {testCases.map((testCase, index) => (
                                <div
                                    key={testCase.id}
                                    className="rounded-md border border-darkHover bg-darkHover/70 p-2"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <p className="text-sm font-semibold text-white">
                                            Case {index + 1}
                                        </p>
                                        <button
                                            className="text-red-300 hover:text-red-200"
                                            onClick={() => removeTestCase(testCase.id)}
                                            title="Delete test case"
                                        >
                                            <LuTrash2 size={16} />
                                        </button>
                                    </div>
                                    <textarea
                                        className="mb-2 min-h-[70px] w-full resize-y rounded-md bg-dark p-2 text-sm text-white outline-none"
                                        placeholder="Input"
                                        value={testCase.input}
                                        onChange={(event) =>
                                            updateTestCase(
                                                testCase.id,
                                                "input",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <textarea
                                        className="min-h-[70px] w-full resize-y rounded-md bg-dark p-2 text-sm text-white outline-none"
                                        placeholder="Expected output"
                                        value={testCase.expectedOutput}
                                        onChange={(event) =>
                                            updateTestCase(
                                                testCase.id,
                                                "expectedOutput",
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <label className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
                                        <input
                                            type="checkbox"
                                            checked={testCase.hidden}
                                            onChange={(event) =>
                                                updateTestCase(
                                                    testCase.id,
                                                    "hidden",
                                                    event.target.checked,
                                                )
                                            }
                                        />
                                        Hidden case (only included during submit)
                                    </label>
                                </div>
                            ))}
                        </div>

                        {evaluationResult && (
                            <div className="rounded-md border border-darkHover bg-darkHover p-2">
                                <p className="text-sm font-semibold text-white">
                                    Verdict: {evaluationResult.verdict} ({evaluationResult.passedCount}/
                                    {evaluationResult.totalCount})
                                </p>
                                <div className="mt-2 max-h-[220px] space-y-2 overflow-y-auto pr-1">
                                    {evaluationResult.results.map((result, index) => (
                                        <div
                                            key={result.id}
                                            className="rounded bg-dark p-2 text-xs text-zinc-100"
                                        >
                                            <p className="mb-1 flex items-center gap-1 font-semibold">
                                                {result.passed ? (
                                                    <LuCheck className="text-emerald-400" />
                                                ) : (
                                                    <LuX className="text-red-400" />
                                                )}
                                                Case {index + 1}
                                            </p>
                                            <p>Input: {result.input || "(empty)"}</p>
                                            <p>Expected: {result.expectedOutput || "(empty)"}</p>
                                            <p>Actual: {result.actualOutput || "(empty)"}</p>
                                            {result.error && (
                                                <p className="text-red-300">Error: {result.error}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "preview" && (
                    <div className="flex h-full flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-300">
                                {canPreview
                                    ? "Preview auto-refreshes on code changes"
                                    : "Preview is available for HTML and React files"}
                            </p>
                            <div className="flex items-center gap-2">
                                {previewBrowserUrl && (
                                    <>
                                        <button
                                            onClick={openPreviewInBrowser}
                                            title="Open live preview in browser"
                                            className="rounded-md border border-primary/60 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                                        >
                                            Open Browser
                                        </button>
                                        <button onClick={copyPreviewLink} title="Copy live preview link">
                                            <LuCopy size={18} className="cursor-pointer text-white" />
                                        </button>
                                    </>
                                )}
                                {previewOutput && (
                                    <button onClick={copyPreviewContent} title="Copy preview source">
                                        <LuCopy size={18} className="cursor-pointer text-white" />
                                    </button>
                                )}
                            </div>
                        </div>
                        {previewBrowserUrl && (
                            <div className="rounded-md border border-darkHover bg-dark px-2 py-1 text-xs text-zinc-300">
                                {previewBrowserUrl}
                            </div>
                        )}
                        {isPreviewLoading ? (
                            <div className="flex h-full items-center justify-center rounded-md border border-darkHover bg-darkHover text-sm text-zinc-300">
                                Building preview...
                            </div>
                        ) : previewError ? (
                            <div className="h-full overflow-auto rounded-md border border-red-400/40 bg-red-500/10 p-3 text-xs text-red-300">
                                {previewError}
                            </div>
                        ) : previewOutput ? (
                            <iframe
                                title="Live preview"
                                className="h-full w-full rounded-md border border-darkHover bg-white"
                                sandbox="allow-scripts allow-same-origin"
                                srcDoc={previewOutput}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-md border border-darkHover bg-darkHover text-sm text-zinc-400">
                                Open an HTML or React file to use preview.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default RunView
