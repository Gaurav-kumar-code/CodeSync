import { useEffect, useState } from "react"
import { Button, Input, Modal, Progress } from "../ui/core"
import { githubService } from "../../services/githubService"

interface RepositoryOption {
  id: number
  name: string
  full_name: string
  owner: { login: string }
  default_branch: string
}

interface GitHubImportModalProps {
  open: boolean
  onClose: () => void
  onImported?: (payload: { projectId: string }) => void
}

const GitHubImportModal = ({ open, onClose, onImported }: GitHubImportModalProps) => {
  const [repositories, setRepositories] = useState<RepositoryOption[]>([])
  const [selectedRepo, setSelectedRepo] = useState("")
  const [branch, setBranch] = useState("main")
  const [createNewProject, setCreateNewProject] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const loadRepos = async () => {
      setIsLoading(true)
      try {
        const data = (await githubService.listRepositories(1, 40)) as RepositoryOption[]
        setRepositories(data)
      } finally {
        setIsLoading(false)
      }
    }

    void loadRepos()
  }, [open])

  const handleImport = async () => {
    const repository = repositories.find((repo) => repo.full_name === selectedRepo)
    if (!repository) {
      return
    }

    setIsLoading(true)
    setProgress(20)
    setMessage(null)

    try {
      setProgress(55)
      const response = await githubService.importRepository({
        owner: repository.owner.login,
        repo: repository.name,
        branch,
        createNewProject,
      })
      setProgress(100)
      setMessage("Repository imported successfully")
      onImported?.({ projectId: response.projectId })
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "Failed to import repository")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import From GitHub"
      description="Choose a repository and branch to sync code into Code Sync."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleImport} loading={isLoading}>
            Import Repository
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="flex flex-col gap-2 text-sm text-neutral-300">
          Repository
          <select
            className="h-11 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-neutral-200"
            value={selectedRepo}
            onChange={(event) => {
              const value = event.target.value
              setSelectedRepo(value)
              const repo = repositories.find((item) => item.full_name === value)
              setBranch(repo?.default_branch ?? "main")
            }}
          >
            <option value="">Select a repository</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.full_name}>
                {repo.full_name}
              </option>
            ))}
          </select>
        </label>

        <Input label="Branch" value={branch} onChange={(event) => setBranch(event.target.value)} />

        <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={createNewProject}
            onChange={(event) => setCreateNewProject(event.target.checked)}
            className="h-4 w-4"
          />
          Create as new project
        </label>

        <Progress value={progress} />

        {message ? <p className="text-sm text-neutral-300">{message}</p> : null}
      </div>
    </Modal>
  )
}

export { GitHubImportModal }
