import illustration from "@/assets/illustration.svg"
import FormComponent from "@/components/forms/FormComponent"
import { Link } from "react-router-dom"

function HomePage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,rgba(65,200,122,0.2),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(14,165,233,0.2),transparent_40%)]" />

            <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-10 pt-8 lg:grid-cols-2">
                <div className="space-y-6 animate-fade-in">
                    <span className="inline-flex rounded-full border border-brand-500/50 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300">
                        Real-Time Collaborative Coding
                    </span>
                    <h1 className="font-display text-4xl font-semibold leading-tight md:text-5xl">
                        Code Together,
                        <br />
                        Ship Smarter.
                    </h1>
                    <p className="max-w-xl text-sm leading-7 text-neutral-400 md:text-base">
                        Code Sync combines multi-user editing, GitHub sync, chunked uploads, analytics, and AI tools in one professional workspace.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/auth"
                            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:scale-[1.02] hover:bg-brand-400"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/dashboard"
                            className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-brand-400 hover:text-brand-300"
                        >
                            Open Dashboard
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">Live cursors and presence</div>
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">GitHub import and push</div>
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">Chunked 100MB uploads</div>
                        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">Execution analytics dashboard</div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex w-full animate-float-up justify-center rounded-3xl border border-neutral-800 bg-neutral-900/50 p-4">
                        <img src={illustration} alt="Code Sync Illustration" className="mx-auto w-[260px] sm:w-[380px]" />
                    </div>
                    <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-2 backdrop-blur">
                        <FormComponent />
                    </div>
                </div>
            </section>
        </main>
    )
}

export default HomePage
