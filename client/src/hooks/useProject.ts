import { useCallback, useState } from "react"
import { projectService } from "../services/projectService"

export const useProject = () => {
  const [projects, setProjects] = useState<any[]>([])
  const [currentProject, setCurrentProject] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadProjects = useCallback(async (search?: string) => {
    setIsLoading(true)
    try {
      const nextProjects = await projectService.listProjects(search)
      setProjects(nextProjects)
      return nextProjects
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadProject = useCallback(async (projectId: string) => {
    setIsLoading(true)
    try {
      const project = await projectService.getProject(projectId)
      setCurrentProject(project)
      return project
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createProject = useCallback(
    async (payload: { name: string; description?: string; tags?: string[]; visibility?: "private" | "link" | "public" }) => {
      const created = await projectService.createProject(payload)
      setProjects((previous) => [created, ...previous])
      return created
    },
    []
  )

  const updateProject = useCallback(async (projectId: string, updates: Record<string, unknown>) => {
    const updated = await projectService.updateProject(projectId, updates)
    setProjects((previous) => previous.map((project) => (project._id === projectId ? updated : project)))
    if (currentProject?._id === projectId) {
      setCurrentProject(updated)
    }
    return updated
  }, [currentProject?._id])

  const deleteProject = useCallback(async (projectId: string) => {
    await projectService.deleteProject(projectId)
    setProjects((previous) => previous.filter((project) => project._id !== projectId))
    if (currentProject?._id === projectId) {
      setCurrentProject(null)
    }
  }, [currentProject?._id])

  return {
    projects,
    currentProject,
    isLoading,
    setCurrentProject,
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    deleteProject,
  }
}
