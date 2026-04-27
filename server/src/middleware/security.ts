import compression from "compression"
import cors from "cors"
import express, { Express } from "express"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import { env } from "../config/env"

const applySecurityMiddleware = (app: Express) => {
  app.set("trust proxy", 1)

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  )

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  )

  app.use(compression())

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 600,
      standardHeaders: true,
      legacyHeaders: false,
    })
  )

  app.use(express.json({ limit: "20mb" }))
  app.use(express.urlencoded({ extended: true, limit: "20mb" }))
}

export { applySecurityMiddleware }
