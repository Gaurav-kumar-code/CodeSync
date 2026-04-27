import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { LoginForm } from "../components/auth/LoginForm"
import { SignupForm } from "../components/auth/SignupForm"
import { AuthPageLayout } from "../components/auth/AuthPageLayout"
import { GitHubAuth } from "../components/auth/GitHubAuth"
import { Tabs } from "../components/ui/core"

const AuthPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login"

  const tabs = useMemo(
    () => [
      { id: "login", label: "Login" },
      { id: "signup", label: "Sign Up" },
    ],
    []
  )

  return (
    <AuthPageLayout
      title={mode === "signup" ? "Create Your Account" : "Welcome Back"}
      subtitle={mode === "signup" ? "Start collaborating in minutes." : "Sign in to continue collaborating."}
    >
      <div className="space-y-4">
        <Tabs
          tabs={tabs}
          activeTab={mode}
          onChange={(nextMode) => {
            setSearchParams({ mode: nextMode })
          }}
        />

        {mode === "signup" ? <SignupForm /> : <LoginForm />}

        <div className="relative py-2 text-center text-xs text-neutral-500">
          <span className="before:absolute before:left-0 before:right-0 before:top-1/2 before:-z-10 before:h-px before:bg-neutral-800">or</span>
        </div>
        <GitHubAuth />
      </div>
    </AuthPageLayout>
  )
}

export default AuthPage
