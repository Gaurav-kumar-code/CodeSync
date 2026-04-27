import { apiClient } from "./api"

const listRepositories = async (page: number = 1, perPage: number = 20) => {
  const response = await apiClient.get("/github/repositories", {
    params: { page, perPage },
  })

  return response.data
}

const importRepository = async (payload: {
  owner: string
  repo: string
  branch?: string
  projectId?: string
  createNewProject?: boolean
}) => {
  const response = await apiClient.post("/github/import-repository", payload)
  return response.data
}

const pushToGithub = async (payload: {
  owner: string
  repo: string
  branch: string
  message: string
  projectId?: string
  files?: Array<{ path: string; content: string }>
}) => {
  const response = await apiClient.post("/github/push-to-github", payload)
  return response.data
}

const getBranches = async (owner: string, repo: string) => {
  const response = await apiClient.get(`/github/branches/${owner}/${repo}`)
  return response.data
}

const getOAuthUrl = async () => {
  const response = await apiClient.get<{ authUrl: string; state: string }>("/github/auth-url")
  return response.data
}

const callbackOAuth = async (code: string) => {
  const response = await apiClient.post("/github/callback", { code })
  return response.data
}

export const githubService = {
  listRepositories,
  importRepository,
  pushToGithub,
  getBranches,
  getOAuthUrl,
  callbackOAuth,
}
