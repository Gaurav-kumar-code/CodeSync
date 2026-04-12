import path from "path"
import * as esbuild from "esbuild"

export type PreviewFileTreeNode = {
    name: string
    type: "file" | "directory"
    content?: string
    children?: PreviewFileTreeNode[]
}

const CODE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"]
const STYLE_EXTENSIONS = [".css"]
const ASSET_EXTENSIONS = [
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".bmp",
    ".avif",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".eot",
]

const ENTRY_CANDIDATES = [
    "/src/main.tsx",
    "/src/main.jsx",
    "/main.tsx",
    "/main.jsx",
    "/src/index.tsx",
    "/src/index.jsx",
    "/index.tsx",
    "/index.jsx",
    "/App.tsx",
    "/App.jsx",
]

const RESOLUTION_SUFFIXES = [
    "",
    ".tsx",
    ".ts",
    ".jsx",
    ".js",
    ".mjs",
    ".cjs",
    ".css",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".bmp",
    ".avif",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".eot",
    ".json",
    "/index.tsx",
    "/index.ts",
    "/index.jsx",
    "/index.js",
    "/index.css",
]

const normalizeVirtualPath = (filePath: string) => {
    const unixPath = filePath.replace(/\\/g, "/")
    const normalized = path.posix.normalize(`/${unixPath}`)
    return normalized.startsWith("/") ? normalized : `/${normalized}`
}

const flattenFileTree = (root: PreviewFileTreeNode) => {
    const files = new Map<string, string>()

    const walk = (node: PreviewFileTreeNode, parentPath: string) => {
        const nodePath =
            parentPath === "" && node.type === "directory" && node.name === "root"
                ? ""
                : node.name
                ? `${parentPath}/${node.name}`.replace(/^\//, "")
                : parentPath.replace(/^\//, "")

        if (node.type === "file") {
            files.set(normalizeVirtualPath(nodePath), node.content || "")
            return
        }

        for (const child of node.children || []) {
            walk(child, nodePath)
        }
    }

    walk(root, "")
    return files
}

const guessEntryFile = (files: Map<string, string>, preferred?: string) => {
    const normalizedPreferred = preferred ? normalizeVirtualPath(preferred) : ""

    if (normalizedPreferred && files.has(normalizedPreferred)) {
        return normalizedPreferred
    }

    const knownEntry = ENTRY_CANDIDATES.find((candidate) => files.has(candidate))
    if (knownEntry) {
        return knownEntry
    }

    const firstReactFile = Array.from(files.keys()).find((filePath) =>
        /\.(tsx|jsx)$/.test(filePath),
    )

    if (firstReactFile) {
        return firstReactFile
    }

    throw new Error(
        "Unable to find React entry file. Add main.tsx/main.jsx or provide entryFilePath.",
    )
}

const hasExtension = (filePath: string, extensions: string[]) =>
    extensions.some((extension) => filePath.endsWith(extension))

const isAssetPath = (filePath: string) => hasExtension(filePath, ASSET_EXTENSIONS)

const isStylePath = (filePath: string) => hasExtension(filePath, STYLE_EXTENSIONS)

const getEsbuildLoader = (filePath: string): esbuild.Loader => {
    if (filePath.endsWith(".tsx")) return "tsx"
    if (filePath.endsWith(".ts")) return "ts"
    if (filePath.endsWith(".jsx")) return "jsx"
    if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs")) return "js"
    if (filePath.endsWith(".css")) return "css"
    if (filePath.endsWith(".json")) return "json"
    return "jsx"
}

const resolveVirtualImport = (
    importPath: string,
    importerPath: string,
    files: Map<string, string>,
) => {
    if (importPath.startsWith("/")) {
        const normalized = normalizeVirtualPath(importPath)
        if (files.has(normalized)) {
            return normalized
        }

        for (const suffix of RESOLUTION_SUFFIXES.slice(1)) {
            const candidate = normalizeVirtualPath(`${importPath}${suffix}`)
            if (files.has(candidate)) {
                return candidate
            }
        }

        return null
    }

    const importerDirectory = importerPath.includes("/")
        ? importerPath.slice(0, importerPath.lastIndexOf("/"))
        : "/"
    const basePath = normalizeVirtualPath(`${importerDirectory}/${importPath}`)

    for (const suffix of RESOLUTION_SUFFIXES) {
        const candidate = suffix ? normalizeVirtualPath(`${basePath}${suffix}`) : basePath
        if (files.has(candidate)) {
            return candidate
        }
    }

    return null
}

const toAssetModuleUrl = (assetBaseUrl: string, previewId: string, assetPath: string) => {
    const normalizedBase = assetBaseUrl.replace(/\/$/, "")
    const encodedPath = encodeURIComponent(assetPath)
    return `${normalizedBase}/api/asset/${previewId}?path=${encodedPath}`
}

export {
    ASSET_EXTENSIONS,
    CODE_EXTENSIONS,
    flattenFileTree,
    getEsbuildLoader,
    guessEntryFile,
    isAssetPath,
    isStylePath,
    normalizeVirtualPath,
    resolveVirtualImport,
    toAssetModuleUrl,
}
