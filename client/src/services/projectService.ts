import { apiClient } from "./api"

export interface ProjectSummary {
  _id: string
  name: string
  description: string
  tags: string[]
  visibility: "private" | "link" | "public"
  isArchived: boolean
  statistics: {
    fileCount: number
    totalSizeBytes: number
    lastModifiedAt: string
  }
  updatedAt: string
}

const createProject = async (payload: {
  name: string
  description?: string
  tags?: string[]
  visibility?: "private" | "link" | "public"
}) => {
  const response = await apiClient.post<ProjectSummary>("/projects/create", payload)
  return response.data
}

const listProjects = async (search?: string) => {
  const response = await apiClient.get<ProjectSummary[]>("/projects", {
    params: { search },
  })

  return response.data
}

const getProject = async (projectId: string) => {
  const response = await apiClient.get(`/projects/${projectId}`)
  return response.data
}

const updateProject = async (projectId: string, updates: Record<string, unknown>) => {
  const response = await apiClient.put(`/projects/${projectId}`, updates)
  return response.data
}

const deleteProject = async (projectId: string) => {
  await apiClient.delete(`/projects/${projectId}`)
}

const inviteCollaborator = async (projectId: string, userId: string, role: string) => {
  const response = await apiClient.post(`/projects/${projectId}/invite`, { userId, role })
  return response.data
}

const createFile = async (projectId: string, payload: Record<string, unknown>) => {
  const response = await apiClient.post(`/projects/${projectId}/files`, payload)
  return response.data
}

const listFiles = async (projectId: string) => {
  const response = await apiClient.get(`/projects/${projectId}/files`)
  return response.data
}

const updateFile = async (projectId: string, fileId: string, payload: Record<string, unknown>) => {
  const response = await apiClient.put(`/projects/${projectId}/files/${fileId}`, payload)
  return response.data
}

const deleteFile = async (projectId: string, fileId: string) => {
  await apiClient.delete(`/projects/${projectId}/files/${fileId}`)
}

const getFileVersions = async (projectId: string, fileId: string) => {
  const response = await apiClient.get(`/projects/${projectId}/files/${fileId}/versions`)
  return response.data
}

const createTestCase = async (projectId: string, payload: Record<string, unknown>) => {
  const response = await apiClient.post(`/projects/${projectId}/tests`, payload)
  return response.data
}

const listTestCases = async (projectId: string, language?: string) => {
  const response = await apiClient.get(`/projects/${projectId}/tests`, {
    params: { language },
  })

  return response.data
}

const updateTestCase = async (projectId: string, testId: string, payload: Record<string, unknown>) => {
  const response = await apiClient.put(`/projects/${projectId}/tests/${testId}`, payload)
  return response.data
}

const deleteTestCase = async (projectId: string, testId: string) => {
  await apiClient.delete(`/projects/${projectId}/tests/${testId}`)
}

export const projectService = {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  inviteCollaborator,
  createFile,
  listFiles,
  updateFile,
  deleteFile,
  getFileVersions,
  createTestCase,
  listTestCases,
  updateTestCase,
  deleteTestCase,
}
