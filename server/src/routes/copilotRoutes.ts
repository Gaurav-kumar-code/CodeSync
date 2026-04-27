import { Router } from "express"
import { runCopilotActionController } from "../controllers/copilotController"

const copilotRoutes = Router()

copilotRoutes.post("/", runCopilotActionController)

export default copilotRoutes
