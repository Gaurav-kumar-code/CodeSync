import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Mail } from "lucide-react"
import { Button, Input } from "../ui/core"
import { useAuthContext } from "../../context/AuthContext"

const LoginForm = () => {
  const navigate = useNavigate()
  const { login } = useAuthContext()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await login(email, password)
      if (!rememberMe) {
        localStorage.removeItem("code-sync:refresh-token")
      }
      navigate("/dashboard")
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || "Login failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        iconLeft={<Mail size={16} />}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        required
      />
      <Input
        id="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        iconRight={
          <button type="button" onClick={() => setShowPassword((previous) => !previous)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your password"
        required
      />
      <label className="flex items-center justify-between text-sm text-neutral-400">
        <span className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            className="h-4 w-4 rounded border-neutral-600 bg-neutral-900"
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          Remember me
        </span>
        <Link to="/auth?mode=signup" className="text-brand-300 hover:text-brand-200">
          Create account
        </Link>
      </label>

      {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Sign In
      </Button>
    </form>
  )
}

export { LoginForm }
