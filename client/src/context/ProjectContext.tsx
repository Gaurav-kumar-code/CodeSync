import { createContext, ReactNode, useContext } from "react"
import { useProject } from "../hooks/useProject"

const ProjectContext = createContext<ReturnType<typeof useProject> | null>(null)

const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const project = useProject()
  return <ProjectContext.Provider value={project}>{children}</ProjectContext.Provider>
}

const useProjectContext = () => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error("useProjectContext must be used inside ProjectProvider")
  }

  return context
}

export { ProjectProvider, useProjectContext }
