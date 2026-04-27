import { Schema, model, InferSchemaType } from "mongoose"

const participantSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    socketId: {
      type: String,
      required: true,
    },
    joinedAt: {
      type: Date,
      default: () => new Date(),
    },
    leftAt: { type: Date },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
)

const sessionSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    participants: {
      type: [participantSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
      index: true,
    },
    startedAt: {
      type: Date,
      default: () => new Date(),
    },
    endedAt: { type: Date },
    durationSeconds: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

sessionSchema.index({ project: 1, status: 1, startedAt: -1 })
sessionSchema.index({ "participants.user": 1, startedAt: -1 })

type SessionDocument = InferSchemaType<typeof sessionSchema>

const SessionModel = model<SessionDocument>("Session", sessionSchema)

export { SessionModel, SessionDocument }
