import { createContext, ReactNode, useContext, useMemo, useState } from "react"

interface ExecutionResult {
  stdout?: string
  stderr?: string
  timeMs?: number
  success?: boolean
}

interface EditorContextValue {
  currentProjectId: string | null
  currentFileId: string | null
  code: string
  language: string
  executionResult: ExecutionResult | null
  setCurrentProjectId: (projectId: string | null) => void
  setCurrentFileId: (fileId: string | null) => void
  setCode: (code: string) => void
  setLanguage: (language: string) => void
  setExecutionResult: (result: ExecutionResult | null) => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

const EditorProvider = ({ children }: { children: ReactNode }) => {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("typescript")
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)

  const value = useMemo(
    () => ({
      currentProjectId,
      currentFileId,
      code,
      language,
      executionResult,
      setCurrentProjectId,
      setCurrentFileId,
      setCode,
      setLanguage,
      setExecutionResult,
    }),
    [currentProjectId, currentFileId, code, language, executionResult]
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

const useEditorContext = () => {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error("useEditorContext must be used within EditorProvider")
  }

  return context
}

export { EditorProvider, useEditorContext }
