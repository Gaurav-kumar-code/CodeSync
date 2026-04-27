import { Router } from "express"
import copilotRoutes from "./copilotRoutes"
import { authRoutes } from "./authRoutes"
import { githubRoutes } from "./githubRoutes"
import { uploadRoutes } from "./uploadRoutes"
import { analyticsRoutes } from "./analyticsRoutes"
import { projectRoutes } from "./projectRoutes"
import { executionRoutes } from "./executionRoutes"

const apiRouter = Router()

apiRouter.use("/copilot", copilotRoutes)
apiRouter.use("/auth", authRoutes)
apiRouter.use("/github", githubRoutes)
apiRouter.use("/uploads", uploadRoutes)
apiRouter.use("/projects", projectRoutes)
apiRouter.use("/projects", analyticsRoutes)
apiRouter.use("/", executionRoutes)

apiRouter.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  })
})

export { apiRouter }
