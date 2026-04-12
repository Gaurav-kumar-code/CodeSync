import { Router } from "express"
import { runCopilotActionController } from "../controllers/copilotController"

const copilotRoutes = Router()

copilotRoutes.post("/copilot", runCopilotActionController)

export default copilotRoutes
