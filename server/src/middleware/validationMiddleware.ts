import { Request, Response, NextFunction } from "express"
import { validationResult } from "express-validator"

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (errors.isEmpty()) {
    return next()
  }

  return res.status(422).json({
    message: "Validation failed",
    errors: errors.array().map((error) => ({
      field: "path" in error ? error.path : "unknown",
      message: error.msg,
      value: "value" in error ? error.value : undefined,
    })),
  })
}

export { validateRequest }
