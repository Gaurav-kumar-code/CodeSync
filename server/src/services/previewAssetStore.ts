import path from "path"
import { normalizeVirtualPath } from "./previewVirtualFileSystem"

type StoredPreviewAsset = {
    content: Buffer
    mimeType: string
}

type PreviewAssetSession = {
    previewId: string
    updatedAt: number
    assets: Map<string, StoredPreviewAsset>
}

const PREVIEW_SESSION_LIMIT = 50
const PREVIEW_SESSION_TTL_MS = 1000 * 60 * 15

const previewSessions = new Map<string, PreviewAssetSession>()

const MIME_BY_EXTENSION: Record<string, string> = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".bmp": "image/bmp",
    ".avif": "image/avif",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
}

const getAssetMimeType = (assetPath: string) => {
    const extension = path.extname(assetPath).toLowerCase()
    return MIME_BY_EXTENSION[extension] || "application/octet-stream"
}

const decodeAssetContent = (rawContent: string) => {
    const dataUrlMatch = rawContent.match(/^data:.*?;base64,(.+)$/)
    if (dataUrlMatch) {
        return Buffer.from(dataUrlMatch[1], "base64")
    }

    return Buffer.from(rawContent, "utf8")
}

const purgeExpiredSessions = () => {
    const now = Date.now()

    for (const [previewId, session] of previewSessions.entries()) {
        if (now - session.updatedAt > PREVIEW_SESSION_TTL_MS) {
            previewSessions.delete(previewId)
        }
    }
}

const trimSessionCount = () => {
    if (previewSessions.size <= PREVIEW_SESSION_LIMIT) {
        return
    }

    const orderedSessions = Array.from(previewSessions.values()).sort(
        (a, b) => a.updatedAt - b.updatedAt,
    )

    const extraCount = orderedSessions.length - PREVIEW_SESSION_LIMIT
    for (let index = 0; index < extraCount; index += 1) {
        previewSessions.delete(orderedSessions[index].previewId)
    }
}

const setPreviewAssets = (previewId: string, assets: Map<string, string>) => {
    purgeExpiredSessions()

    const storedAssets = new Map<string, StoredPreviewAsset>()

    for (const [assetPath, rawContent] of assets.entries()) {
        const normalizedPath = normalizeVirtualPath(assetPath)
        storedAssets.set(normalizedPath, {
            content: decodeAssetContent(rawContent),
            mimeType: getAssetMimeType(normalizedPath),
        })
    }

    previewSessions.set(previewId, {
        previewId,
        updatedAt: Date.now(),
        assets: storedAssets,
    })

    trimSessionCount()
}

const getPreviewAsset = (previewId: string, assetPath: string) => {
    purgeExpiredSessions()

    const session = previewSessions.get(previewId)
    if (!session) {
        return null
    }

    session.updatedAt = Date.now()

    const normalizedPath = normalizeVirtualPath(assetPath)
    return session.assets.get(normalizedPath) || null
}

export { getPreviewAsset, setPreviewAssets }
