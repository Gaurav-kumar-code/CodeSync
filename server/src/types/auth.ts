export type CollaboratorRole = "owner" | "editor" | "viewer" | "commenter"

export interface JwtAccessPayload {
  userId: string
  email: string
  username: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthenticatedUser {
  _id: string
  email: string
  username: string
  role?: CollaboratorRole
}
