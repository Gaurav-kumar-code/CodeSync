import crypto from "crypto"
import { env } from "../config/env"

const normalizeKey = () => {
  const key = env.encryptionKey
  if (key.length === 32) {
    return Buffer.from(key)
  }

  return crypto.createHash("sha256").update(key).digest()
}

const ivLength = 16

const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(ivLength)
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    normalizeKey() as unknown as crypto.CipherKey,
    iv as unknown as crypto.BinaryLike
  )
  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  return `${iv.toString("hex")}:${encrypted}`
}

const decrypt = (text: string): string => {
  const [ivHex, encryptedHex] = text.split(":")
  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload format")
  }

  const iv = Buffer.from(ivHex, "hex")
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    normalizeKey() as unknown as crypto.CipherKey,
    iv as unknown as crypto.BinaryLike
  )
  let decrypted = decipher.update(encryptedHex, "hex", "utf8")
  decrypted += decipher.final("utf8")
  return decrypted
}

export { encrypt, decrypt }
