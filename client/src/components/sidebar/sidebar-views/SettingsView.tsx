import Select from "@/components/common/Select"
import { useSettings } from "@/context/SettingContext"
import { editorFonts } from "@/resources/Fonts"
import { editorThemes } from "@/resources/Themes"
import { authService } from "@/services/authService"
import { githubService } from "@/services/githubService"
import { getApiHealth } from "@/services/systemService"
import { langNames } from "@uiw/codemirror-extensions-langs"
import { AxiosError } from "axios"
import { Code2, Database, Link2, RefreshCw } from "lucide-react"
import { ChangeEvent, useEffect, useState } from "react"

type GitHubConnectionStatus = "idle" | "checking" | "connected" | "not-connected" | "error"
type DatabaseConnectionStatus = "idle" | "checking" | "online" | "offline"

type RepositorySummary = {
    id: number
    full_name: string
}

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof AxiosError) {
        const payload = error.response?.data as { message?: string } | undefined
        return payload?.message ?? fallback
    }

    if (error instanceof Error) {
        return error.message
    }

    return fallback
}

function SettingsView() {
    const {
        theme,
        setTheme,
        language,
        setLanguage,
        fontSize,
        setFontSize,
        fontFamily,
        setFontFamily,
        showGitHubCorner,
        setShowGitHubCorner,
        resetSettings,
    } = useSettings()
    const [gitHubStatus, setGitHubStatus] =
        useState<GitHubConnectionStatus>("idle")
    const [gitHubMessage, setGitHubMessage] =
        useState("Connect GitHub to import repositories and push code.")
    const [repositoryPreview, setRepositoryPreview] = useState<string[]>([])
    const [databaseStatus, setDatabaseStatus] =
        useState<DatabaseConnectionStatus>("idle")
    const [databaseMessage, setDatabaseMessage] = useState(
        "Check API and database availability from the frontend.",
    )
    const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null)
    const [isGitHubLoading, setIsGitHubLoading] = useState(false)
    const [isDatabaseLoading, setIsDatabaseLoading] = useState(false)

    const handleFontFamilyChange = (e: ChangeEvent<HTMLSelectElement>) =>
        setFontFamily(e.target.value)
    const handleThemeChange = (e: ChangeEvent<HTMLSelectElement>) =>
        setTheme(e.target.value)
    const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) =>
        setLanguage(e.target.value)
    const handleFontSizeChange = (e: ChangeEvent<HTMLSelectElement>) =>
        setFontSize(parseInt(e.target.value))
    const handleShowGitHubCornerChange = (e: ChangeEvent<HTMLInputElement>) =>
        setShowGitHubCorner(e.target.checked)

    const handleGitHubConnect = async () => {
        try {
            const { authUrl, state } = await authService.getGitHubAuthUrl()
            localStorage.setItem("code-sync:oauth-state", state)
            window.location.assign(authUrl)
        } catch (error: unknown) {
            setGitHubStatus("error")
            setGitHubMessage(
                getErrorMessage(
                    error,
                    "Could not start GitHub authentication. Verify server env values.",
                ),
            )
        }
    }

    const handleGitHubStatusCheck = async () => {
        setIsGitHubLoading(true)
        setGitHubStatus("checking")
        setRepositoryPreview([])

        try {
            const repositories = (await githubService.listRepositories(
                1,
                3,
            )) as RepositorySummary[]

            const topRepositories = Array.isArray(repositories)
                ? repositories.map((repository) => repository.full_name).filter(Boolean)
                : []

            setRepositoryPreview(topRepositories)
            setGitHubStatus("connected")
            setGitHubMessage("GitHub integration is active for your account.")
        } catch (error: unknown) {
            if (error instanceof AxiosError && error.response?.status === 400) {
                setGitHubStatus("not-connected")
                setGitHubMessage("GitHub account is not connected yet. Click Connect GitHub.")
            } else if (error instanceof AxiosError && error.response?.status === 401) {
                setGitHubStatus("error")
                setGitHubMessage("Session expired. Log in again, then retry GitHub test.")
            } else {
                setGitHubStatus("error")
                setGitHubMessage(
                    getErrorMessage(
                        error,
                        "Unable to validate GitHub access right now.",
                    ),
                )
            }
        } finally {
            setIsGitHubLoading(false)
        }
    }

    const handleDatabaseStatusCheck = async () => {
        setIsDatabaseLoading(true)
        setDatabaseStatus("checking")

        try {
            const health = await getApiHealth()
            setLastHealthCheck(new Date(health.timestamp).toLocaleString())

            if (health.status === "ok") {
                setDatabaseStatus("online")
                setDatabaseMessage("Backend API and MongoDB path are responding.")
            } else {
                setDatabaseStatus("offline")
                setDatabaseMessage("Health endpoint responded with a non-ok status.")
            }
        } catch (error: unknown) {
            setDatabaseStatus("offline")
            setDatabaseMessage(
                getErrorMessage(
                    error,
                    "Health check failed. Verify backend URL and MongoDB connection.",
                ),
            )
        } finally {
            setIsDatabaseLoading(false)
        }
    }

    useEffect(() => {
        // Set editor font family
        const editor = document.querySelector(
            ".cm-editor > .cm-scroller",
        ) as HTMLElement
        if (editor !== null) {
            editor.style.fontFamily = `${fontFamily}, monospace`
        }
    }, [fontFamily])

    useEffect(() => {
        void handleDatabaseStatusCheck()
    }, [])

    return (
        <div className="flex h-full min-h-0 flex-col items-center gap-2 p-4">
            <h1 className="view-title">Settings</h1>
            {/* Choose Font Family option */}
            <div className="flex w-full items-end gap-2">
                <Select
                    onChange={handleFontFamilyChange}
                    value={fontFamily}
                    options={editorFonts}
                    title="Font Family"
                />
                {/* Choose font size option */}
                <select
                    value={fontSize}
                    onChange={handleFontSizeChange}
                    className="rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none"
                    title="Font Size"
                >
                    {[...Array(13).keys()].map((size) => {
                        return (
                            <option key={size} value={size + 12}>
                                {size + 12}
                            </option>
                        )
                    })}
                </select>
            </div>
            {/* Choose theme option */}
            <Select
                onChange={handleThemeChange}
                value={theme}
                options={Object.keys(editorThemes)}
                title="Theme"
            />
            {/* Choose language option */}
            <Select
                onChange={handleLanguageChange}
                value={language}
                options={langNames}
                title="Language"
            />
            {/* Show GitHub corner option */}
            <div className="mt-4 flex w-full items-center justify-between">
                <label>Show github corner</label>
                <label className="relative inline-flex cursor-pointer items-center">
                    <input
                        className="peer sr-only"
                        type="checkbox"
                        title="Toggle GitHub corner visibility"
                        aria-label="Toggle GitHub corner visibility"
                        onChange={handleShowGitHubCornerChange}
                        checked={showGitHubCorner}
                    />
                    <div className="peer h-6 w-12 rounded-full bg-darkHover outline-none duration-100 after:absolute after:left-1 after:top-1 after:flex after:h-4 after:w-4 after:items-center after:justify-center after:rounded-full after:bg-white after:font-bold after:outline-none after:duration-500 peer-checked:after:translate-x-6 peer-checked:after:border-white peer-focus:outline-none"></div>
                </label>
            </div>

            <div className="mt-4 w-full rounded-md border border-darkHover bg-darkHover/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Code2 size={16} />
                        GitHub Integration
                    </div>
                    <span
                        className="rounded-full border border-darkHover px-2 py-1 text-xs"
                        title="GitHub integration status"
                    >
                        {gitHubStatus === "connected"
                            ? "Connected"
                            : gitHubStatus === "checking"
                              ? "Checking"
                              : gitHubStatus === "not-connected"
                                ? "Not connected"
                                : gitHubStatus === "error"
                                  ? "Error"
                                  : "Not tested"}
                    </span>
                </div>
                <p className="mb-3 text-xs text-gray-200">{gitHubMessage}</p>
                {repositoryPreview.length > 0 ? (
                    <div className="mb-3 text-xs text-gray-300">
                        Recent repositories: {repositoryPreview.join(", ")}
                    </div>
                ) : null}
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <button
                        className="flex items-center justify-center gap-2 rounded-md border-none bg-dark px-3 py-2 text-sm text-white outline-none"
                        onClick={handleGitHubConnect}
                    >
                        <Link2 size={14} />
                        Connect GitHub
                    </button>
                    <button
                        className="flex items-center justify-center gap-2 rounded-md border-none bg-dark px-3 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleGitHubStatusCheck}
                        disabled={isGitHubLoading}
                    >
                        <RefreshCw size={14} className={isGitHubLoading ? "animate-spin" : ""} />
                        {isGitHubLoading ? "Checking..." : "Test Access"}
                    </button>
                </div>
            </div>

            <div className="w-full rounded-md border border-darkHover bg-darkHover/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Database size={16} />
                        Database Health
                    </div>
                    <span
                        className="rounded-full border border-darkHover px-2 py-1 text-xs"
                        title="API and database health"
                    >
                        {databaseStatus === "online"
                            ? "Online"
                            : databaseStatus === "checking"
                              ? "Checking"
                              : databaseStatus === "offline"
                                ? "Offline"
                                : "Not tested"}
                    </span>
                </div>
                <p className="mb-2 text-xs text-gray-200">{databaseMessage}</p>
                {lastHealthCheck ? (
                    <p className="mb-3 text-xs text-gray-300">
                        Last success: {lastHealthCheck}
                    </p>
                ) : null}
                <button
                    className="flex w-full items-center justify-center gap-2 rounded-md border-none bg-dark px-3 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleDatabaseStatusCheck}
                    disabled={isDatabaseLoading}
                >
                    <RefreshCw size={14} className={isDatabaseLoading ? "animate-spin" : ""} />
                    {isDatabaseLoading ? "Checking health..." : "Check Database Status"}
                </button>
            </div>

            <button
                className="mt-auto w-full rounded-md border-none bg-darkHover px-4 py-2 text-white outline-none"
                onClick={resetSettings}
            >
                Reset to default
            </button>
        </div>
    )
}

export default SettingsView
