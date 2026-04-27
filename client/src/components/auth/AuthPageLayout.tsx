import { ReactNode } from "react"

const AuthPageLayout = ({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(65,200,122,0.18),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_42%)]" />
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-8 px-6 py-10 lg:grid-cols-2">
        <div className="hidden rounded-3xl border border-neutral-800 bg-neutral-900/40 p-10 shadow-2xl backdrop-blur md:block animate-fade-in">
          <h2 className="font-display text-4xl font-semibold leading-tight text-neutral-100">
            Build Together.
            <br />
            Ship Faster.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-400">
            Code Sync combines collaborative editing, GitHub import, advanced analytics, and AI-assisted workflows in one workspace.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-neutral-300">
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">Real-time editing</div>
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">GitHub sync</div>
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">Chunked uploads</div>
            <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">Execution analytics</div>
          </div>
        </div>
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur animate-scale-up">
          <h1 className="font-display text-3xl font-semibold text-neutral-50">{title}</h1>
          <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

export { AuthPageLayout }
