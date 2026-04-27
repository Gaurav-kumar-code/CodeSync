import { NextFunction, Request, Response } from "express"
import { HttpError, isHttpError } from "../utils/httpError"
import { LogService } from "../services/logService"

const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, "Route not found"))
}

const errorHandler = async (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = isHttpError(error) ? error.statusCode : 500
  const message =
    isHttpError(error) && error.message
      ? error.message
      : "An unexpected server error occurred"

  try {
    await LogService.createLog({
      actionType: "ERROR",
      userId: req.user?._id,
      projectId: typeof req.body?.projectId === "string" ? req.body.projectId : undefined,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? "",
      requestId: req.requestId,
      statusCode,
      success: false,
      errorMessage: message,
      details: {
        method: req.method,
        path: req.originalUrl,
        body: req.body,
      },
    })
  } catch (logError) {
    console.error("Failed to write error log", logError)
  }

  if (statusCode >= 500) {
    console.error(error)
  }

  return res.status(statusCode).json({
    message,
    requestId: req.requestId,
    details: isHttpError(error) ? error.details : undefined,
  })
}

export { errorHandler, notFoundHandler }
