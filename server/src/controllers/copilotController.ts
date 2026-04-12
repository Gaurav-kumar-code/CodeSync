import { Request, Response } from "express"
import {
    CopilotActionType,
    CopilotRequestBody,
} from "../types/copilot"
import { runGeminiCopilotAction } from "../services/copilotService"

const VALID_ACTIONS: CopilotActionType[] = [
    "generate",
    "fix",
    "explain",
    "tests",
]

const runCopilotActionController = async (req: Request, res: Response) => {
    try {
        const { action, userPrompt, fileName, fileContent } =
            req.body as Partial<CopilotRequestBody>

        if (!action || !VALID_ACTIONS.includes(action)) {
            return res.status(400).json({
                error: "Invalid action. Allowed: generate, fix, explain, tests",
            })
        }

        if (!fileName || typeof fileName !== "string") {
            return res.status(400).json({ error: "fileName is required" })
        }

        if (typeof fileContent !== "string") {
            return res.status(400).json({ error: "fileContent must be a string" })
        }

        if (typeof userPrompt !== "string") {
            return res.status(400).json({ error: "userPrompt must be a string" })
        }

        const result = await runGeminiCopilotAction({
            action,
            userPrompt,
            fileName,
            fileContent,
        })

        return res.status(200).json(result)
    } catch (error: any) {
        console.error("Copilot controller error:", error)

        return res.status(500).json({
            error: "Failed to process copilot request",
            details: error?.message || "Unknown error",
        })
    }
}

export { runCopilotActionController }
