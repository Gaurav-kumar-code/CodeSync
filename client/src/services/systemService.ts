import { apiClient } from "./api"

type HealthResponse = {
  status: string
  timestamp: string
}

const getApiHealth = async () => {
  const response = await apiClient.get<HealthResponse>("/health")
  return response.data
}

export { getApiHealth }
export type { HealthResponse }
