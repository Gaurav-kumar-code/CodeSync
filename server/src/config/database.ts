import mongoose from "mongoose"
import { env } from "./env"

let isConnected = false

const connectDatabase = async () => {
  if (isConnected) {
    return mongoose.connection
  }

  await mongoose.connect(env.mongoUri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000,
  })

  isConnected = true

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB error:", error)
  })

  mongoose.connection.on("disconnected", () => {
    isConnected = false
  })

  return mongoose.connection
}

export { connectDatabase }
