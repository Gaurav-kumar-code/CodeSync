import { Schema, model, InferSchemaType } from "mongoose"

const testCaseSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    language: {
      type: String,
      required: true,
    },
    input: {
      type: String,
      default: "",
    },
    expectedOutput: {
      type: String,
      required: true,
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

testCaseSchema.index({ project: 1, language: 1, createdAt: -1 })

type TestCaseDocument = InferSchemaType<typeof testCaseSchema>

const TestCaseModel = model<TestCaseDocument>("TestCase", testCaseSchema)

export { TestCaseModel, TestCaseDocument }
