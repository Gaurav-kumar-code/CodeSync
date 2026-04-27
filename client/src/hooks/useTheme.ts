import { useEffect, useMemo, useState } from "react"

type ThemeMode = "light" | "dark" | "system"

const STORAGE_KEY = "code-sync:theme"

const resolveSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const persistedTheme = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    return persistedTheme ?? "system"
  })

  const effectiveTheme = useMemo(() => {
    return theme === "system" ? resolveSystemTheme() : theme
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme, effectiveTheme])

  useEffect(() => {
    if (theme !== "system") {
      return
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      document.documentElement.dataset.theme = resolveSystemTheme()
    }

    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  const toggleTheme = () => {
    setTheme((previous) => {
      if (previous === "light") return "dark"
      if (previous === "dark") return "system"
      return "light"
    })
  }

  return {
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
  }
}

export type { ThemeMode }
