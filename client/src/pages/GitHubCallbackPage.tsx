import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuthContext } from "../context/AuthContext"

const GitHubCallbackPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithGitHub } = useAuthContext()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const completeOAuth = async () => {
      const code = searchParams.get("code")
      const returnedState = searchParams.get("state")
      const storedState = localStorage.getItem("code-sync:oauth-state")

      if (!code) {
        setErrorMessage("Missing GitHub OAuth code")
        return
      }

      if (storedState && returnedState && storedState !== returnedState) {
        setErrorMessage("Invalid OAuth state")
        return
      }

      try {
        await loginWithGitHub(code)
        navigate("/dashboard")
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || "GitHub authentication failed")
      }
    }

    void completeOAuth()
  }, [loginWithGitHub, navigate, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 text-center shadow-xl">
        <h1 className="font-display text-2xl font-semibold">GitHub Authentication</h1>
        <p className="mt-2 text-sm text-neutral-400">Completing secure sign in...</p>
        {errorMessage ? <p className="mt-4 text-sm text-red-400">{errorMessage}</p> : null}
      </div>
    </div>
  )
}

export default GitHubCallbackPage
