import { FormEvent, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Input, Progress } from "../ui/core"
import { useAuthContext } from "../../context/AuthContext"

const strengthScore = (password: string) => {
  let score = 0
  if (password.length >= 8) score += 20
  if (/[A-Z]/.test(password)) score += 20
  if (/[a-z]/.test(password)) score += 20
  if (/[0-9]/.test(password)) score += 20
  if (/[^A-Za-z0-9]/.test(password)) score += 20
  return score
}

const SignupForm = () => {
  const navigate = useNavigate()
  const { signup } = useAuthContext()

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const score = useMemo(() => strengthScore(password), [password])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match")
      return
    }

    if (!acceptedTerms) {
      setErrorMessage("You must accept terms to continue")
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await signup({ email, username, password })
      navigate("/dashboard")
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || "Signup failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input id="signup-email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input
        id="signup-username"
        label="Username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        minLength={2}
        maxLength={32}
        required
      />
      <Input id="signup-password" label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <Progress value={score} variant={score >= 80 ? "success" : score >= 50 ? "warning" : "error"} />
      <Input
        id="signup-confirm-password"
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
      />

      <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
        <input
          type="checkbox"
          checked={acceptedTerms}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
          onChange={(event) => setAcceptedTerms(event.target.checked)}
        />
        I agree to the terms and privacy policy.
      </label>

      {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}

      <Button type="submit" className="w-full" loading={isSubmitting}>
        Create Account
      </Button>
    </form>
  )
}

export { SignupForm }
