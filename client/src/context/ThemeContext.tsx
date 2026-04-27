import { createContext, ReactNode, useContext } from "react"
import { ThemeMode, useTheme } from "../hooks/useTheme"

interface ThemeContextValue {
  theme: ThemeMode
  effectiveTheme: "light" | "dark"
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { theme, effectiveTheme, setTheme, toggleTheme } = useTheme()

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme: effectiveTheme as "light" | "dark",
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

const useThemeContext = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider")
  }

  return context
}

export { ThemeProvider, useThemeContext }
