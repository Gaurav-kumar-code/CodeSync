import { useCallback, useEffect, useState } from "react"
import { AuthUser, authService } from "../services/authService"

const ACCESS_TOKEN_KEY = "code-sync:access-token"
const REFRESH_TOKEN_KEY = "code-sync:refresh-token"

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }

  const clearTokens = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  const refreshProfile = useCallback(async () => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!accessToken) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const profile = await authService.fetchProfile()
      setUser(profile)
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshProfile()
  }, [refreshProfile])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password)
    setTokens(response.accessToken, response.refreshToken)
    setUser(response.user)
    return response.user
  }, [])

  const signup = useCallback(async (payload: { email: string; password: string; username: string }) => {
    const response = await authService.signup(payload)
    setTokens(response.accessToken, response.refreshToken)
    setUser(response.user)
    return response.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Ignore logout request failures, local cleanup is still required.
    }

    clearTokens()
    setUser(null)
  }, [])

  const loginWithGitHub = useCallback(async (code: string) => {
    const response = await authService.handleGitHubCallback(code)
    setTokens(response.accessToken, response.refreshToken)
    setUser(response.user)
    return response.user
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    logout,
    loginWithGitHub,
    refreshProfile,
  }
}
