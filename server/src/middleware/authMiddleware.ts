import { NextFunction, Request, Response } from "express"
import { AuthService } from "../services/authService"

const extractBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null
  }

  return authorizationHeader.replace("Bearer ", "").trim()
}

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractBearerToken(req.header("authorization"))

    if (!token) {
      return res.status(401).json({ message: "Missing bearer token" })
    }

    const payload = AuthService.verifyAccessToken(token)
    const user = await AuthService.getUserById(payload.userId)

    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    req.user = {
      _id: String(user._id),
      email: user.email,
      username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
    }

    return next()
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" })
  }
}

export { requireAuth, extractBearerToken }
