import { NextFunction, Request, Response } from "express"
import { randomUUID } from "crypto"
import { LogService } from "../services/logService"

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now()
  req.requestId = randomUUID()

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt

    let actionType: string = "REQUEST"
    if (req.originalUrl.includes("run-code")) {
      actionType = "CODE_EXECUTED"
    }
    if (req.originalUrl.includes("evaluate-code")) {
      actionType = "CODE_EVALUATED"
    }
    if (req.originalUrl.includes("upload")) {
      actionType = "UPLOAD_CHUNK"
    }

    void LogService.createLog({
      actionType,
      userId: req.user?._id,
      projectId: req.params?.projectId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? "",
      requestId: req.requestId,
      statusCode: res.statusCode,
      durationMs,
      success: res.statusCode < 400,
      details: {
        method: req.method,
        path: req.originalUrl,
        query: req.query,
      },
      errorMessage: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : "",
    }).catch((error) => {
      console.error("Request logger failed", error)
    })
  })

  next()
}

export { requestLogger }
