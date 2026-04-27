import { createContext, ReactNode, useContext } from "react"
import { useAuth } from "../hooks/useAuth"

const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null)

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }

  return context
}

export { AuthProvider, useAuthContext }
