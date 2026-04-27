import { Router } from "express"
import { body } from "express-validator"
import { AuthService } from "../services/authService"
import { validateRequest } from "../middleware/validationMiddleware"
import { requireAuth } from "../middleware/authMiddleware"
import { HttpError } from "../utils/httpError"

const authRoutes = Router()

authRoutes.post(
  "/signup",
  [
    body("email").isEmail(),
    body("password").isString().isLength({ min: 8 }),
    body("username").isString().isLength({ min: 2, max: 32 }),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await AuthService.signup(req.body)
      return res.status(201).json(result)
    } catch (error) {
      return next(error)
    }
  }
)

authRoutes.post(
  "/login",
  [body("email").isEmail(), body("password").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await AuthService.login(req.body)
      return res.status(200).json(result)
    } catch (error) {
      return next(error)
    }
  }
)

authRoutes.post(
  "/refresh",
  [body("refreshToken").isString().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body
      const tokens = await AuthService.refreshAccessToken(refreshToken)
      return res.status(200).json(tokens)
    } catch (error) {
      return next(error)
    }
  }
)

authRoutes.post("/logout", requireAuth, async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new HttpError(401, "User is not authenticated")
    }

    await AuthService.logout(req.user._id)
    return res.status(204).send()
  } catch (error) {
    return next(error)
  }
})

authRoutes.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await AuthService.getUserById(String(req.user?._id))

    if (!user) {
      throw new HttpError(404, "User not found")
    }

    return res.status(200).json({
      _id: String(user._id),
      email: user.email,
      profile: user.profile,
      preferences: user.preferences,
      github: user.github
        ? {
            id: user.github.id,
            username: user.github.username,
            avatarUrl: user.github.avatarUrl,
            profileUrl: user.github.profileUrl,
          }
        : null,
    })
  } catch (error) {
    return next(error)
  }
})

authRoutes.post(
  "/password-reset/request",
  [body("email").isEmail()],
  validateRequest,
  async (req, res, next) => {
    try {
      const { resetToken } = await AuthService.createPasswordResetToken(req.body.email)

      return res.status(200).json({
        message: "If the account exists, a reset token has been generated",
        resetToken,
      })
    } catch (error) {
      return next(error)
    }
  }
)

authRoutes.post(
  "/password-reset/confirm",
  [
    body("resetToken").isString().notEmpty(),
    body("password").isString().isLength({ min: 8 }),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      await AuthService.resetPassword(req.body.resetToken, req.body.password)
      return res.status(200).json({ message: "Password has been reset" })
    } catch (error) {
      return next(error)
    }
  }
)

export { authRoutes }
