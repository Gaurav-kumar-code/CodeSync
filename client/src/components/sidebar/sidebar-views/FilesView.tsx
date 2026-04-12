import { useEffect, useRef, useState } from "react"
import FileStructureView from "@/components/files/FileStructureView"
import { useFileSystem } from "@/context/FileContext"
import useResponsive from "@/hooks/useResponsive"
import {
    parseDirectoryHandle,
    parseDropToProjectTree,
    parseFileListToProjectTree,
    parseZipProject,
    validateZipFile,
} from "@/services/projectImportService"
import { FileSystemItem } from "@/types/file"
import cn from "classnames"
import { BiArchiveIn } from "react-icons/bi"
import { RiFolderOpenLine } from "react-icons/ri"
import { TbFileUpload, TbFileZip } from "react-icons/tb"
import { toast } from "react-hot-toast"

function FilesView() {
    const { downloadFilesAndFolders, replaceProjectTree } = useFileSystem()
    const { viewHeight } = useResponsive()
    const { minHeightReached } = useResponsive()
    const [isLoading, setIsLoading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const zipInputRef = useRef<HTMLInputElement | null>(null)
    const folderInputRef = useRef<HTMLInputElement | null>(null)

    const applyImportedProject = (
        children: FileSystemItem[],
        successMessage: string,
    ) => {
        if (!children.length) {
            toast.error("No supported files found in uploaded project")
            return
        }

        replaceProjectTree(children)
        toast.success(successMessage)
    }

    const runImport = async (
        importer: () => Promise<FileSystemItem[]>,
        successMessage: string,
    ) => {
        try {
            setIsLoading(true)
            toast.loading("Importing project...")
            const children = await importer()
            toast.dismiss()
            applyImportedProject(children, successMessage)
        } catch (error: any) {
            toast.dismiss()
            toast.error(error?.message || "Failed to import project")
        } finally {
            setIsLoading(false)
        }
    }

    const handleOpenDirectory = async () => {
        // Check for modern API support
        if ("showDirectoryPicker" in window) {
            await runImport(async () => {
                const directoryHandle = await window.showDirectoryPicker()
                return parseDirectoryHandle({ handle: directoryHandle })
            }, "Directory imported successfully")
            return
        }

        folderInputRef.current?.click()
    }

    const handleFolderFileInputChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const files = event.target.files
        if (!files || !files.length) return

        await runImport(
            () => parseFileListToProjectTree({ files }),
            "Folder imported successfully",
        )

        event.target.value = ""
    }

    const handleZipInputChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const selectedFile = event.target.files?.[0]
        if (!selectedFile) return

        const validation = validateZipFile(selectedFile)
        if (!validation.isValid) {
            toast.error(validation.message || "Invalid zip file")
            event.target.value = ""
            return
        }

        await runImport(
            () => parseZipProject({ file: selectedFile }),
            "Zip project imported successfully",
        )

        event.target.value = ""
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        if (!isDragging) {
            setIsDragging(true)
        }
    }

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        if (event.currentTarget === event.target) {
            setIsDragging(false)
        }
    }

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setIsDragging(false)

        await runImport(
            () => parseDropToProjectTree({ dataTransfer: event.dataTransfer }),
            "Project imported from drop",
        )
    }

    useEffect(() => {
        const openUploadDialog = () => zipInputRef.current?.click()
        window.addEventListener("codesync:open-upload-dialog", openUploadDialog)
        return () => {
            window.removeEventListener(
                "codesync:open-upload-dialog",
                openUploadDialog,
            )
        }
    }, [])

    const renderLoadingSkeleton = () => {
        if (!isLoading) return null

        return (
            <div className="space-y-2 p-2">
                <div className="h-8 animate-pulse rounded-md bg-darkHover" />
                <div className="h-8 animate-pulse rounded-md bg-darkHover" />
                <div className="h-8 animate-pulse rounded-md bg-darkHover" />
                <div className="h-8 animate-pulse rounded-md bg-darkHover" />
            </div>
        )
    }

    return (
        <div
            className="relative flex select-none flex-col gap-1 px-4 py-2"
            style={{ height: viewHeight, maxHeight: viewHeight }}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-2 z-20 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-dark/90">
                    <p className="text-sm font-semibold text-primary">
                        Drop a folder or zip file to import project
                    </p>
                </div>
            )}
            {isLoading ? renderLoadingSkeleton() : <FileStructureView />}
            <div
                className={cn(`flex min-h-fit flex-col justify-end pt-2`, {
                    hidden: minHeightReached,
                })}
            >
                <hr />
                <div className="mt-2 grid grid-cols-1 gap-2">
                    <button
                        className="flex w-full justify-start rounded-md p-2 transition-all hover:bg-darkHover"
                        onClick={() => zipInputRef.current?.click()}
                        disabled={isLoading}
                    >
                        <TbFileZip className="mr-2" size={22} /> Upload Zip
                    </button>
                    <button
                        className="flex w-full justify-start rounded-md p-2 transition-all hover:bg-darkHover"
                        onClick={handleOpenDirectory}
                        disabled={isLoading}
                    >
                        <RiFolderOpenLine className="mr-2" size={22} />
                        Open Folder
                    </button>
                </div>
                <button
                    className="mt-2 flex w-full justify-start rounded-md p-2 transition-all hover:bg-darkHover"
                    onClick={() => zipInputRef.current?.click()}
                    disabled={isLoading}
                >
                    <TbFileUpload className="mr-2" size={24} />
                    {isLoading ? "Importing..." : "Quick Upload"}
                </button>
                <button
                    className="flex w-full justify-start rounded-md p-2 transition-all hover:bg-darkHover"
                    onClick={downloadFilesAndFolders}
                >
                    <BiArchiveIn className="mr-2" size={22} /> Download Code
                </button>
            </div>

            <input
                ref={zipInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                aria-label="Upload zip project"
                title="Upload zip project"
                onChange={handleZipInputChange}
            />

            <input
                ref={folderInputRef}
                type="file"
                className="hidden"
                aria-label="Upload folder"
                title="Upload folder"
                // @ts-expect-error webkitdirectory is supported in chromium based browsers
                webkitdirectory=""
                onChange={handleFolderFileInputChange}
            />
        </div>
    )
}

export default FilesView
