import { FileSystemItem } from "@/types/file"
import JSZip from "jszip"
import { v4 as uuidv4 } from "uuid"

const DEFAULT_MAX_UPLOAD_SIZE_MB = 25
const DEFAULT_MAX_FILE_SIZE_MB = 2
const BLOCKED_FOLDERS = new Set(["node_modules", ".git", ".vscode", ".next", "dist", "build"])

type RelativeProjectFile = {
    path: string
    file: File
}

type ProjectImportValidation = {
    isValid: boolean
    message?: string
}

interface WebkitFileEntry {
    isFile: true
    isDirectory: false
    name: string
    fullPath: string
    file: (callback: (file: File) => void) => void
}

interface WebkitDirectoryEntry {
    isFile: false
    isDirectory: true
    name: string
    fullPath: string
    createReader: () => {
        readEntries: (cb: (entries: Array<WebkitEntry>) => void) => void
    }
}

type WebkitEntry = WebkitFileEntry | WebkitDirectoryEntry

const bytesToMb = (bytes: number) => bytes / (1024 * 1024)

const shouldSkipPath = (path: string) => {
    const parts = path.split("/").filter(Boolean)
    return parts.some((part) => BLOCKED_FOLDERS.has(part))
}

const createDirectoryNode = (name: string): FileSystemItem => ({
    id: uuidv4(),
    name,
    type: "directory",
    children: [],
    isOpen: false,
})

const createFileNode = (name: string, content: string): FileSystemItem => ({
    id: uuidv4(),
    name,
    type: "file",
    content,
})

const findOrCreateDirectory = (children: FileSystemItem[], name: string) => {
    const existingDirectory = children.find(
        (child) => child.type === "directory" && child.name === name,
    )

    if (existingDirectory && existingDirectory.children) {
        return existingDirectory
    }

    const createdDirectory = createDirectoryNode(name)
    children.push(createdDirectory)
    return createdDirectory
}

const insertFileInTree = ({
    rootChildren,
    fullPath,
    content,
}: {
    rootChildren: FileSystemItem[]
    fullPath: string
    content: string
}) => {
    const normalizedPath = fullPath.replace(/\\/g, "/").replace(/^\//, "")
    const segments = normalizedPath.split("/").filter(Boolean)

    if (segments.length === 0) {
        return
    }

    const fileName = segments[segments.length - 1]
    const directoryPath = segments.slice(0, -1)

    let currentChildren = rootChildren

    for (const segment of directoryPath) {
        const directory = findOrCreateDirectory(currentChildren, segment)
        currentChildren = directory.children || []
        directory.children = currentChildren
    }

    const existingFileIndex = currentChildren.findIndex(
        (item) => item.type === "file" && item.name === fileName,
    )

    const nextFile = createFileNode(fileName, content)

    if (existingFileIndex >= 0) {
        currentChildren[existingFileIndex] = nextFile
    } else {
        currentChildren.push(nextFile)
    }
}

const readFileContent = async ({
    file,
    maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
}: {
    file: File
    maxFileSizeMb?: number
}) => {
    if (bytesToMb(file.size) > maxFileSizeMb) {
        return `File skipped: ${file.name} is larger than ${maxFileSizeMb}MB.`
    }

    try {
        return await file.text()
    } catch {
        return `File could not be read as text: ${file.name}`
    }
}

const validateZipFile = (
    file: File,
    maxUploadSizeMb = DEFAULT_MAX_UPLOAD_SIZE_MB,
): ProjectImportValidation => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
        return {
            isValid: false,
            message: "Please upload a valid .zip file",
        }
    }

    if (bytesToMb(file.size) > maxUploadSizeMb) {
        return {
            isValid: false,
            message: `Zip file is too large. Maximum supported size is ${maxUploadSizeMb}MB.`,
        }
    }

    return { isValid: true }
}

const parseZipProject = async ({
    file,
    maxUploadSizeMb = DEFAULT_MAX_UPLOAD_SIZE_MB,
    maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
}: {
    file: File
    maxUploadSizeMb?: number
    maxFileSizeMb?: number
}) => {
    const validation = validateZipFile(file, maxUploadSizeMb)

    if (!validation.isValid) {
        throw new Error(validation.message)
    }

    const zip = await JSZip.loadAsync(file)
    const rootChildren: FileSystemItem[] = []
    const entries = Object.values(zip.files)

    for (let index = 0; index < entries.length; index++) {
        const entry = entries[index]

        if (entry.dir) {
            continue
        }

        const path = entry.name.replace(/\\/g, "/")

        if (shouldSkipPath(path)) {
            continue
        }

        const fileName = path.split("/").filter(Boolean).pop() || ""
        const content = await entry.async("string")
        const estimatedSizeMb = bytesToMb(content.length)

        insertFileInTree({
            rootChildren,
            fullPath: path,
            content:
                estimatedSizeMb > maxFileSizeMb
                    ? `File skipped: ${fileName} is larger than ${maxFileSizeMb}MB.`
                    : content || `File could not be read as text: ${fileName}`,
        })

        if (index % 25 === 0) {
            await Promise.resolve()
        }
    }

    return rootChildren
}

const parseDirectoryHandle = async ({
    handle,
    maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
}: {
    handle: FileSystemDirectoryHandle
    maxFileSizeMb?: number
}) => {
    const rootChildren: FileSystemItem[] = []

    const walkDirectory = async (
        directoryHandle: FileSystemDirectoryHandle,
        prefix = "",
    ) => {
        for await (const entry of directoryHandle.values()) {
            const path = prefix ? `${prefix}/${entry.name}` : entry.name

            if (shouldSkipPath(path)) {
                continue
            }

            if (entry.kind === "directory") {
                await walkDirectory(entry, path)
            } else {
                const file = await entry.getFile()
                const content = await readFileContent({ file, maxFileSizeMb })
                insertFileInTree({
                    rootChildren,
                    fullPath: path,
                    content,
                })
            }
        }
    }

    await walkDirectory(handle)
    return rootChildren
}

const readDirectoryEntries = async (
    entry: WebkitDirectoryEntry,
): Promise<WebkitEntry[]> => {
    const reader = entry.createReader()
    const entries: WebkitEntry[] = []

    return new Promise((resolve) => {
        const collect = () => {
            reader.readEntries((batch) => {
                if (!batch.length) {
                    resolve(entries)
                    return
                }

                entries.push(...batch)
                collect()
            })
        }

        collect()
    })
}

const readFileEntry = (entry: WebkitFileEntry) =>
    new Promise<File>((resolve) => {
        entry.file((file) => resolve(file))
    })

const extractDroppedRelativeFiles = async (
    items: DataTransferItemList,
): Promise<RelativeProjectFile[]> => {
    const output: RelativeProjectFile[] = []

    const walkEntry = async (entry: WebkitEntry, prefix = "") => {
        const currentPath = prefix ? `${prefix}/${entry.name}` : entry.name

        if (shouldSkipPath(currentPath)) {
            return
        }

        if (entry.isFile) {
            const file = await readFileEntry(entry)
            output.push({ path: currentPath, file })
            return
        }

        const childEntries = await readDirectoryEntries(entry)
        for (const child of childEntries) {
            await walkEntry(child, currentPath)
        }
    }

    for (const item of Array.from(items)) {
        const entry = item.webkitGetAsEntry?.() as WebkitEntry | null
        if (!entry) {
            continue
        }

        await walkEntry(entry)
    }

    return output
}

const parseRelativeFilesToTree = async ({
    files,
    maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
}: {
    files: RelativeProjectFile[]
    maxFileSizeMb?: number
}) => {
    const rootChildren: FileSystemItem[] = []

    for (let index = 0; index < files.length; index++) {
        const relativeFile = files[index]
        const content = await readFileContent({
            file: relativeFile.file,
            maxFileSizeMb,
        })

        insertFileInTree({
            rootChildren,
            fullPath: relativeFile.path,
            content,
        })

        if (index % 25 === 0) {
            await Promise.resolve()
        }
    }

    return rootChildren
}

const parseDropToProjectTree = async ({
    dataTransfer,
    maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
    maxUploadSizeMb = DEFAULT_MAX_UPLOAD_SIZE_MB,
}: {
    dataTransfer: DataTransfer
    maxFileSizeMb?: number
    maxUploadSizeMb?: number
}) => {
    const droppedFiles = Array.from(dataTransfer.files)

    if (droppedFiles.length === 1 && droppedFiles[0].name.endsWith(".zip")) {
        return parseZipProject({
            file: droppedFiles[0],
            maxFileSizeMb,
            maxUploadSizeMb,
        })
    }

    if (dataTransfer.items?.length) {
        const relativeFiles = await extractDroppedRelativeFiles(dataTransfer.items)
        if (relativeFiles.length) {
            return parseRelativeFilesToTree({
                files: relativeFiles,
                maxFileSizeMb,
            })
        }
    }

    const fallbackRelativeFiles = droppedFiles
        .filter((file) => file.webkitRelativePath)
        .map((file) => ({
            path: file.webkitRelativePath,
            file,
        }))

    if (fallbackRelativeFiles.length) {
        return parseRelativeFilesToTree({
            files: fallbackRelativeFiles,
            maxFileSizeMb,
        })
    }

    throw new Error("Unsupported drop payload. Please drop a folder or a zip file.")
}

const parseFileListToProjectTree = async ({
    files,
    maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB,
}: {
    files: FileList
    maxFileSizeMb?: number
}) => {
    const relativeFiles: RelativeProjectFile[] = Array.from(files)
        .filter((file) => file.webkitRelativePath)
        .map((file) => ({
            path: file.webkitRelativePath,
            file,
        }))

    if (!relativeFiles.length) {
        throw new Error("No folder structure found in selected files")
    }

    return parseRelativeFilesToTree({
        files: relativeFiles,
        maxFileSizeMb,
    })
}

export {
    DEFAULT_MAX_UPLOAD_SIZE_MB,
    DEFAULT_MAX_FILE_SIZE_MB,
    validateZipFile,
    parseZipProject,
    parseDirectoryHandle,
    parseDropToProjectTree,
    parseFileListToProjectTree,
}
