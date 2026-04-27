import bcrypt from "bcryptjs"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { env } from "../config/env"
import { UserModel } from "../models"
import { JwtAccessPayload } from "../types/auth"
import { encrypt } from "../utils/crypto"
import { HttpError } from "../utils/httpError"

const refreshTokenTtlMs = 30 * 24 * 60 * 60 * 1000

const validatePasswordStrength = (password: string) => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include an uppercase letter")
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must include a lowercase letter")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must include a number")
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must include a special character")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

const toPublicUser = (user: any) => ({
  _id: String(user._id),
  email: user.email,
  username: user.profile?.username ?? user.email?.split("@")[0] ?? "user",
  avatar: user.profile?.avatar,
  bio: user.profile?.bio,
  preferences: user.preferences,
  github: user.github
    ? {
        id: user.github.id,
        username: user.github.username,
        avatarUrl: user.github.avatarUrl,
        profileUrl: user.github.profileUrl,
      }
    : null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

class AuthService {
  static generateAccessToken(payload: JwtAccessPayload) {
    const expiresIn = env.jwtExpire as jwt.SignOptions["expiresIn"]
    return jwt.sign(payload, env.jwtSecret, {
      expiresIn,
    })
  }

  static generateRefreshToken(userId: string) {
    return jwt.sign({ userId, tokenType: "refresh" }, env.jwtSecret, {
      expiresIn: "30d",
    })
  }

  static verifyAccessToken(token: string) {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtAccessPayload
    return decoded
  }

  static async hashPassword(password: string) {
    const rounds = env.bcryptRounds
    return bcrypt.hash(password, rounds)
  }

  static async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash)
  }

  static async signup(params: { email: string; password: string; username: string }) {
    const email = params.email.toLowerCase().trim()
    const username = params.username.trim()

    const existing = await UserModel.findOne({
      $or: [{ email }, { "profile.username": username }],
    })

    if (existing) {
      throw new HttpError(409, "Email or username is already registered")
    }

    const passwordCheck = validatePasswordStrength(params.password)
    if (!passwordCheck.valid) {
      throw new HttpError(400, "Weak password", { errors: passwordCheck.errors })
    }

    const passwordHash = await this.hashPassword(params.password)

    const user = await UserModel.create({
      email,
      passwordHash,
      profile: {
        username,
      },
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
    })

    const accessToken = this.generateAccessToken({
      userId: String(user._id),
      email: user.email,
      username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
    })

    const refreshToken = this.generateRefreshToken(String(user._id))
    user.refreshTokenHash = await this.hashPassword(refreshToken)
    await user.save()

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    }
  }

  static async login(params: { email: string; password: string }) {
    const email = params.email.toLowerCase().trim()

    const user = await UserModel.findOne({ email }).select("+passwordHash +refreshTokenHash")

    if (!user || !user.passwordHash) {
      throw new HttpError(401, "Invalid credentials")
    }

    const isValid = await this.comparePassword(params.password, user.passwordHash)
    if (!isValid) {
      throw new HttpError(401, "Invalid credentials")
    }

    const accessToken = this.generateAccessToken({
      userId: String(user._id),
      email: user.email,
      username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
    })

    const refreshToken = this.generateRefreshToken(String(user._id))
    user.refreshTokenHash = await this.hashPassword(refreshToken)
    user.lastLoginAt = new Date()
    user.lastActiveAt = new Date()
    await user.save()

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    }
  }

  static async refreshAccessToken(refreshToken: string) {
    let decoded: { userId: string; tokenType: string }

    try {
      decoded = jwt.verify(refreshToken, env.jwtSecret) as {
        userId: string
        tokenType: string
      }
    } catch {
      throw new HttpError(401, "Invalid refresh token")
    }

    if (decoded.tokenType !== "refresh") {
      throw new HttpError(401, "Invalid token type")
    }

    const user = await UserModel.findById(decoded.userId).select("+refreshTokenHash")
    if (!user || !user.refreshTokenHash) {
      throw new HttpError(401, "Refresh token not found")
    }

    const tokenMatches = await this.comparePassword(refreshToken, user.refreshTokenHash)
    if (!tokenMatches) {
      throw new HttpError(401, "Refresh token mismatch")
    }

    const nextAccessToken = this.generateAccessToken({
      userId: String(user._id),
      email: user.email,
      username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
    })

    const nextRefreshToken = this.generateRefreshToken(String(user._id))
    user.refreshTokenHash = await this.hashPassword(nextRefreshToken)
    user.lastActiveAt = new Date()
    await user.save()

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    }
  }

  static async logout(userId: string) {
    await UserModel.findByIdAndUpdate(userId, {
      $unset: { refreshTokenHash: "" },
    })
  }

  static async getUserById(userId: string) {
    return UserModel.findById(userId)
  }

  static async createPasswordResetToken(email: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt"
    )

    if (!user) {
      return { resetToken: null }
    }

    const rawToken = crypto.randomBytes(32).toString("hex")
    user.passwordResetTokenHash = await this.hashPassword(rawToken)
    user.passwordResetExpiresAt = new Date(Date.now() + refreshTokenTtlMs)
    await user.save()

    return { resetToken: rawToken }
  }

  static async resetPassword(resetToken: string, nextPassword: string) {
    const passwordCheck = validatePasswordStrength(nextPassword)
    if (!passwordCheck.valid) {
      throw new HttpError(400, "Weak password", { errors: passwordCheck.errors })
    }

    const users = await UserModel.find({
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt")

    for (const user of users) {
      const tokenHash = user.passwordResetTokenHash
      if (!tokenHash) {
        continue
      }

      const matches = await this.comparePassword(resetToken, tokenHash)
      if (!matches) {
        continue
      }

      user.passwordHash = await this.hashPassword(nextPassword)
      user.passwordResetTokenHash = undefined
      user.passwordResetExpiresAt = undefined
      user.refreshTokenHash = undefined
      await user.save()
      return
    }

    throw new HttpError(400, "Invalid or expired reset token")
  }

  static async upsertGitHubUser(params: {
    githubId: string
    githubUsername: string
    email: string
    avatarUrl?: string
    profileUrl?: string
    accessToken: string
    refreshToken?: string
    tokenExpiresAt?: Date
  }) {
    const email = params.email.toLowerCase().trim()
    let user = await UserModel.findOne({
      $or: [{ email }, { "github.id": params.githubId }],
    }).select("+passwordHash +refreshTokenHash")

    if (!user) {
      user = await UserModel.create({
        email,
        profile: {
          username: params.githubUsername,
          avatar: params.avatarUrl,
        },
      })
    }

    user.github = {
      id: params.githubId,
      username: params.githubUsername,
      avatarUrl: params.avatarUrl,
      profileUrl: params.profileUrl,
      accessTokenEncrypted: encrypt(params.accessToken),
      refreshTokenEncrypted: params.refreshToken ? encrypt(params.refreshToken) : undefined,
      tokenExpiresAt: params.tokenExpiresAt,
    }
    user.lastLoginAt = new Date()
    user.lastActiveAt = new Date()

    await user.save()

    const accessToken = this.generateAccessToken({
      userId: String(user._id),
      email: user.email,
      username: user.profile?.username ?? user.email.split("@")[0] ?? "user",
    })

    const refreshToken = this.generateRefreshToken(String(user._id))
    user.refreshTokenHash = await this.hashPassword(refreshToken)
    await user.save()

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    }
  }
}

export { AuthService, validatePasswordStrength, toPublicUser }
