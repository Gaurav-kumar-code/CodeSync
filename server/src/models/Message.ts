import { Schema, model, InferSchemaType } from "mongoose"

const readBySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    readAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false }
)

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 8000,
    },
    markdown: {
      type: Boolean,
      default: true,
    },
    mentions: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    readBy: {
      type: [readBySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

messageSchema.index({ project: 1, createdAt: -1 })
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 })

type MessageDocument = InferSchemaType<typeof messageSchema>

const MessageModel = model<MessageDocument>("Message", messageSchema)

export { MessageModel, MessageDocument }
