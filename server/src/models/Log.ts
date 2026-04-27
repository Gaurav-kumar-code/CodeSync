import { Schema, model, InferSchemaType } from "mongoose"

const ACTION_TYPES = [
  "FILE_CREATED",
  "FILE_UPDATED",
  "FILE_DELETED",
  "FILE_RENAMED",
  "DIRECTORY_CREATED",
  "DIRECTORY_UPDATED",
  "DIRECTORY_DELETED",
  "DIRECTORY_RENAMED",
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "PROJECT_ARCHIVED",
  "PROJECT_DELETED",
  "COLLABORATOR_INVITED",
  "COLLABORATOR_REMOVED",
  "COLLABORATOR_ROLE_CHANGED",
  "CODE_EXECUTED",
  "CODE_EVALUATED",
  "UPLOAD_INITIATED",
  "UPLOAD_CHUNK",
  "UPLOAD_COMPLETED",
  "UPLOAD_FAILED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "GITHUB_CONNECTED",
  "GITHUB_IMPORT",
  "GITHUB_PUSH",
  "ERROR",
  "REQUEST",
] as const

const logSchema = new Schema(
  {
    actionType: {
      type: String,
      enum: ACTION_TYPES,
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    file: {
      type: Schema.Types.ObjectId,
      ref: "File",
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    requestId: {
      type: String,
      index: true,
    },
    statusCode: {
      type: Number,
    },
    durationMs: {
      type: Number,
    },
    success: {
      type: Boolean,
      default: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

logSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
logSchema.index({ project: 1, createdAt: -1 })
logSchema.index({ user: 1, createdAt: -1 })
logSchema.index({ actionType: 1, createdAt: -1 })

type LogDocument = InferSchemaType<typeof logSchema>

const LogModel = model<LogDocument>("Log", logSchema)

export { LogModel, LogDocument, ACTION_TYPES }
