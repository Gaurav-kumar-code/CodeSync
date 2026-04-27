import { Schema, model, InferSchemaType } from "mongoose"

const fileVersionSchema = new Schema(
  {
    version: { type: Number, required: true },
    content: { type: String, default: "" },
    message: { type: String, default: "" },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    modifiedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false }
)

const fileSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    parentDirectory: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    isDirectory: {
      type: Boolean,
      default: false,
      index: true,
    },
    content: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "plaintext",
      index: true,
    },
    contentHash: {
      type: String,
    },
    sizeBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    versions: {
      type: [fileVersionSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

fileSchema.index({ project: 1, path: 1 }, { unique: true })
fileSchema.index({ project: 1, parentDirectory: 1, name: 1 })
fileSchema.index({ project: 1, updatedAt: -1 })

type FileDocument = InferSchemaType<typeof fileSchema>

const FileModel = model<FileDocument>("File", fileSchema)

export { FileModel, FileDocument }
