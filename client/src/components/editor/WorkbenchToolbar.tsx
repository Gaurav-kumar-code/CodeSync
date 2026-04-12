import { useFileSystem } from "@/context/FileContext"
import { useRunCode } from "@/context/RunCodeContext"
import { useViews } from "@/context/ViewContext"
import { VIEWS } from "@/types/view"
import { LuDownload, LuFolderUp, LuPlay, LuSparkles } from "react-icons/lu"

function WorkbenchToolbar() {
    const { setActiveView, setIsSidebarOpen } = useViews()
    const { runCode, isRunning } = useRunCode()
    const { downloadFilesAndFolders } = useFileSystem()

    const openUploadDialog = () => {
        setActiveView(VIEWS.FILES)
        setIsSidebarOpen(true)
        window.dispatchEvent(new CustomEvent("codesync:open-upload-dialog"))
    }

    const openRunPanel = () => {
        setActiveView(VIEWS.RUN)
        setIsSidebarOpen(true)
    }

    const openAiPanel = () => {
        setActiveView(VIEWS.COPILOT)
        setIsSidebarOpen(true)
    }

    return (
        <div className="flex min-h-[48px] w-full items-center justify-between border-b border-darkHover bg-dark px-3 py-2">
            <div className="flex items-center gap-2">
                <button
                    className="inline-flex items-center gap-2 rounded-md border border-darkHover bg-darkHover px-3 py-1.5 text-sm font-semibold text-zinc-200 transition hover:border-primary/50 hover:text-primary"
                    onClick={openUploadDialog}
                    title="Upload project zip"
                >
                    <LuFolderUp size={16} /> Upload
                </button>
                <button
                    className="inline-flex items-center gap-2 rounded-md border border-darkHover bg-darkHover px-3 py-1.5 text-sm font-semibold text-zinc-200 transition hover:border-primary/50 hover:text-primary"
                    onClick={openRunPanel}
                    title="Open run panel"
                >
                    <LuPlay size={16} /> Run Panel
                </button>
                <button
                    className="inline-flex items-center gap-2 rounded-md border border-darkHover bg-darkHover px-3 py-1.5 text-sm font-semibold text-zinc-200 transition hover:border-primary/50 hover:text-primary"
                    onClick={openAiPanel}
                    title="Open AI panel"
                >
                    <LuSparkles size={16} /> AI
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={runCode}
                    disabled={isRunning}
                    title="Run current file"
                >
                    <LuPlay size={16} /> {isRunning ? "Running..." : "Run"}
                </button>
                <button
                    className="inline-flex items-center gap-2 rounded-md border border-darkHover bg-darkHover px-3 py-1.5 text-sm font-semibold text-zinc-200 transition hover:border-primary/50 hover:text-primary"
                    onClick={downloadFilesAndFolders}
                    title="Download project"
                >
                    <LuDownload size={16} /> Download
                </button>
            </div>
        </div>
    )
}

export default WorkbenchToolbar
