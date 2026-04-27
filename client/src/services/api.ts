import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL ?? `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000"}/api`

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("code-sync:access-token")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status as number | undefined
    const originalRequest = error.config as { _retry?: boolean } | undefined

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem("code-sync:refresh-token")

      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          })

          const nextAccessToken = refreshResponse.data?.accessToken
          const nextRefreshToken = refreshResponse.data?.refreshToken

          if (nextAccessToken && nextRefreshToken) {
            localStorage.setItem("code-sync:access-token", nextAccessToken)
            localStorage.setItem("code-sync:refresh-token", nextRefreshToken)
            error.config.headers.Authorization = `Bearer ${nextAccessToken}`
            return apiClient.request(error.config)
          }
        } catch {
          localStorage.removeItem("code-sync:access-token")
          localStorage.removeItem("code-sync:refresh-token")
        }
      }
    }

    return Promise.reject(error)
  }
)

export { apiClient, API_BASE_URL }
