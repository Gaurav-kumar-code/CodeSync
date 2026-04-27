import { apiClient } from "./api"

export interface AuthUser {
  _id: string
  email: string
  username: string
  avatar?: string
  bio?: string
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

const login = async (email: string, password: string) => {
  const response = await apiClient.post<AuthResponse>("/auth/login", { email, password })
  return response.data
}

const signup = async (params: { email: string; password: string; username: string }) => {
  const response = await apiClient.post<AuthResponse>("/auth/signup", params)
  return response.data
}

const logout = async () => {
  await apiClient.post("/auth/logout")
}

const refreshToken = async (token: string) => {
  const response = await apiClient.post<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
    refreshToken: token,
  })

  return response.data
}

const fetchProfile = async () => {
  const response = await apiClient.get<AuthUser>("/auth/me")
  return response.data
}

const requestPasswordReset = async (email: string) => {
  const response = await apiClient.post<{ message: string; resetToken?: string }>(
    "/auth/password-reset/request",
    {
      email,
    }
  )

  return response.data
}

const confirmPasswordReset = async (resetToken: string, password: string) => {
  const response = await apiClient.post<{ message: string }>("/auth/password-reset/confirm", {
    resetToken,
    password,
  })

  return response.data
}

const getGitHubAuthUrl = async (state?: string) => {
  const response = await apiClient.get<{ authUrl: string; state: string }>("/github/auth-url", {
    params: {
      state,
    },
  })

  return response.data
}

const handleGitHubCallback = async (code: string) => {
  const response = await apiClient.post<AuthResponse>("/github/callback", {
    code,
  })

  return response.data
}

export const authService = {
  login,
  signup,
  logout,
  refreshToken,
  fetchProfile,
  requestPasswordReset,
  confirmPasswordReset,
  getGitHubAuthUrl,
  handleGitHubCallback,
}
