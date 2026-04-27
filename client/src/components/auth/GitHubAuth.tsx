import { Code2 } from "lucide-react"
import { Button } from "../ui/core"
import { authService } from "../../services/authService"

const GitHubAuth = () => {
  const onGitHubSignIn = async () => {
    const { authUrl, state } = await authService.getGitHubAuthUrl()
    localStorage.setItem("code-sync:oauth-state", state)
    window.location.assign(authUrl)
  }

  return (
    <Button type="button" variant="secondary" className="w-full" iconLeft={<Code2 size={16} />} onClick={onGitHubSignIn}>
      Continue With GitHub
    </Button>
  )
}

export { GitHubAuth }
