import { Router } from "express"
import { param, query } from "express-validator"
import { requireAuth } from "../middleware/authMiddleware"
import { requireProjectRole } from "../middleware/rbacMiddleware"
import { validateRequest } from "../middleware/validationMiddleware"
import { LogService } from "../services/logService"

const analyticsRoutes = Router()

analyticsRoutes.get(
  "/:projectId/analytics",
  requireAuth,
  requireProjectRole(["viewer"]),
  [
    param("projectId").isString().notEmpty(),
    query("from").optional().isISO8601(),
    query("to").optional().isISO8601(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const analytics = await LogService.getProjectStatistics(
        req.params.projectId,
        req.query.from as string | undefined,
        req.query.to as string | undefined
      )

      return res.status(200).json(analytics)
    } catch (error) {
      return next(error)
    }
  }
)

analyticsRoutes.get(
  "/:projectId/logs",
  requireAuth,
  requireProjectRole(["viewer"]),
  [param("projectId").isString().notEmpty(), query("limit").optional().isInt({ min: 1, max: 1000 })],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = Number(req.query.limit ?? 200)
      const logs = await LogService.getProjectActivityLogs(req.params.projectId, limit)
      return res.status(200).json(logs)
    } catch (error) {
      return next(error)
    }
  }
)

analyticsRoutes.get(
  "/:projectId/execution-history",
  requireAuth,
  requireProjectRole(["viewer"]),
  [param("projectId").isString().notEmpty(), query("limit").optional().isInt({ min: 1, max: 500 })],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = Number(req.query.limit ?? 100)
      const history = await LogService.getExecutionHistory(req.params.projectId, limit)
      return res.status(200).json(history)
    } catch (error) {
      return next(error)
    }
  }
)

analyticsRoutes.get(
  "/:projectId/error-logs",
  requireAuth,
  requireProjectRole(["viewer"]),
  [param("projectId").isString().notEmpty(), query("limit").optional().isInt({ min: 1, max: 500 })],
  validateRequest,
  async (req, res, next) => {
    try {
      const limit = Number(req.query.limit ?? 100)
      const errors = await LogService.getErrorLogs(req.params.projectId, limit)
      return res.status(200).json(errors)
    } catch (error) {
      return next(error)
    }
  }
)

analyticsRoutes.get(
  "/:projectId/report",
  requireAuth,
  requireProjectRole(["viewer"]),
  [param("projectId").isString().notEmpty(), query("period").optional().isIn(["daily", "weekly", "monthly"])],
  validateRequest,
  async (req, res, next) => {
    try {
      const period = (req.query.period as "daily" | "weekly" | "monthly") ?? "weekly"
      const report = await LogService.getActivityReport(req.params.projectId, period)
      return res.status(200).json(report)
    } catch (error) {
      return next(error)
    }
  }
)

analyticsRoutes.get(
  "/:projectId/stats",
  requireAuth,
  requireProjectRole(["viewer"]),
  [
    param("projectId").isString().notEmpty(),
    query("from").optional().isISO8601(),
    query("to").optional().isISO8601(),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const stats = await LogService.getProjectStatistics(
        req.params.projectId,
        req.query.from as string | undefined,
        req.query.to as string | undefined
      )
      return res.status(200).json(stats.totals)
    } catch (error) {
      return next(error)
    }
  }
)

analyticsRoutes.post(
  "/:projectId/export-logs",
  requireAuth,
  requireProjectRole(["viewer"]),
  [param("projectId").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const csv = await LogService.exportProjectLogsCsv(req.params.projectId)
      const fileName = `project-${req.params.projectId}-logs.csv`

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`)

      return res.status(200).send(csv)
    } catch (error) {
      return next(error)
    }
  }
)

export { analyticsRoutes }
