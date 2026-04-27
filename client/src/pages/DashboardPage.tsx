import { useEffect, useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"
import { useProjectContext } from "../context/ProjectContext"
import { Button, Input } from "../components/ui/core"
import { ProjectCard } from "../components/dashboard/ProjectCard"
import { useNavigate } from "react-router-dom"

const DashboardPage = () => {
  const navigate = useNavigate()
  const { projects, loadProjects, createProject, isLoading } = useProjectContext()
  const [searchText, setSearchText] = useState("")

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const filteredProjects = useMemo(() => {
    if (!searchText.trim()) {
      return projects
    }

    return projects.filter((project) => {
      const name = String(project.name ?? "").toLowerCase()
      const description = String(project.description ?? "").toLowerCase()
      const query = searchText.toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [projects, searchText])

  const onCreateProject = async () => {
    const created = await createProject({
      name: `New Project ${new Date().toLocaleDateString()}`,
      description: "Collaborative workspace",
      tags: ["realtime", "codesync"],
    })

    navigate(`/editor/${created._id}`)
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-3xl font-semibold">Project Dashboard</h1>
            <p className="text-sm text-neutral-400">Manage projects, collaborators, and active coding sessions.</p>
          </div>
          <Button iconLeft={<Plus size={16} />} onClick={onCreateProject}>
            Create Project
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Input
            label="Search projects"
            value={searchText}
            iconLeft={<Search size={15} />}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by name or description"
          />
          <Button variant="secondary" onClick={() => loadProjects(searchText)}>
            Apply Filter
          </Button>
        </div>

        {isLoading ? <p className="text-sm text-neutral-500">Loading projects...</p> : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </section>
      </div>
    </div>
  )
}

export default DashboardPage
