import { Router } from "express"
import { body } from "express-validator"
import { evaluateAgainstTestCases, runOneCompiler, TestCase } from "../services/executionService"
import { validateRequest } from "../middleware/validationMiddleware"
import { LogService } from "../services/logService"

const executionRoutes = Router()

executionRoutes.post(
  "/run-code",
  [body("code").isString().notEmpty(), body("language").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const { code, language, input, files } = req.body
      const startedAt = Date.now()
      const response = await runOneCompiler({ code, language, input, files })

      await LogService.createLog({
        actionType: "CODE_EXECUTED",
        userId: req.user?._id,
        projectId: req.body.projectId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        success: true,
        details: {
          language,
        },
      })

      return res.status(200).json(response)
    } catch (error) {
      return next(error)
    }
  }
)

executionRoutes.post(
  "/evaluate-code",
  [
    body("code").isString().notEmpty(),
    body("language").isString().notEmpty(),
    body("mode").isIn(["run", "submit"]),
    body("testCases").isArray({ min: 1 }),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const {
        code,
        language,
        testCases,
        mode,
        files,
      }: {
        code: string
        language: string
        testCases: TestCase[]
        mode: "run" | "submit"
        files?: Array<{ name: string; content: string }>
      } = req.body

      const startedAt = Date.now()

      const result = await evaluateAgainstTestCases({
        code,
        language,
        testCases,
        mode,
        files,
      })

      await LogService.createLog({
        actionType: "CODE_EVALUATED",
        userId: req.user?._id,
        projectId: req.body.projectId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        success: true,
        details: {
          language,
          mode,
          totalCount: result.totalCount,
          passedCount: result.passedCount,
        },
      })

      return res.status(200).json(result)
    } catch (error) {
      return next(error)
    }
  }
)

export { executionRoutes }
