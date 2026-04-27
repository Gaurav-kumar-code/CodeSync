import { Schema, model, InferSchemaType } from "mongoose"

const uploadSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
    mimeType: {
      type: String,
      required: true,
    },
    checksum: {
      type: String,
    },
    chunkSize: {
      type: Number,
      required: true,
    },
    totalChunks: {
      type: Number,
      required: true,
    },
    uploadedChunks: {
      type: [Number],
      default: [],
    },
    uploadedChunksCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["uploading", "completed", "failed", "canceled"],
      default: "uploading",
      index: true,
    },
    tempDir: {
      type: String,
      required: true,
    },
    storagePath: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

uploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
uploadSchema.index({ user: 1, status: 1, createdAt: -1 })
uploadSchema.index({ project: 1, status: 1, createdAt: -1 })

type UploadDocument = InferSchemaType<typeof uploadSchema>

const UploadModel = model<UploadDocument>("Upload", uploadSchema)

export { UploadModel, UploadDocument }
