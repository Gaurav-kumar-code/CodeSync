import SplitterComponent from "@/components/SplitterComponent"
import ConnectionStatusPage from "@/components/connection/ConnectionStatusPage"
import Sidebar from "@/components/sidebar/Sidebar"
import WorkSpace from "@/components/workspace"
import { useAppContext } from "@/context/AppContext"
import { useFileSystem } from "@/context/FileContext"
import { useSocket } from "@/context/SocketContext"
import useFullScreen from "@/hooks/useFullScreen"
import useUserActivity from "@/hooks/useUserActivity"
import { projectService } from "@/services/projectService"
import { FileSystemItem } from "@/types/file"
import { SocketEvent } from "@/types/socket"
import { USER_STATUS, User } from "@/types/user"
import { useEffect } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { toast } from "react-hot-toast"

type ProjectFileRecord = {
    _id: string
    name: string
    isDirectory: boolean
    parentDirectory?: string | null
    content?: string
}

const buildFileTree = (files: ProjectFileRecord[]): FileSystemItem[] => {
    const nodeMap = new Map<string, FileSystemItem>()
    const parentMap = new Map<string, string | null>()
    const rootChildren: FileSystemItem[] = []

    files.forEach((file) => {
        const node: FileSystemItem = {
            id: file._id,
            name: file.name,
            type: file.isDirectory ? "directory" : "file",
            children: file.isDirectory ? [] : undefined,
            content: file.isDirectory ? undefined : file.content ?? "",
            isOpen: false,
        }

        nodeMap.set(file._id, node)
        parentMap.set(file._id, file.parentDirectory ?? null)
    })

    nodeMap.forEach((node, id) => {
        const parentId = parentMap.get(id)
        if (!parentId) {
            rootChildren.push(node)
            return
        }

        const parent = nodeMap.get(parentId)
        if (!parent || parent.type !== "directory") {
            rootChildren.push(node)
            return
        }

        if (!parent.children) {
            parent.children = []
        }

        parent.children.push(node)
    })

    return rootChildren
}

function EditorPage() {
    // Listen user online/offline status
    useUserActivity()
    // Enable fullscreen mode
    useFullScreen()
    const navigate = useNavigate()
    const { roomId } = useParams()
    const { status, setCurrentUser, currentUser } = useAppContext()
    const { replaceProjectTree } = useFileSystem()
    const { socket } = useSocket()
    const location = useLocation()

    useEffect(() => {
        if (currentUser.username.length > 0) return
        const username = location.state?.username
        if (username === undefined) {
            navigate("/", {
                state: { roomId },
            })
        } else if (roomId) {
            const user: User = { username, roomId }
            setCurrentUser(user)
            socket.emit(SocketEvent.JOIN_REQUEST, user)
        }
    }, [
        currentUser.username,
        location.state?.username,
        navigate,
        roomId,
        setCurrentUser,
        socket,
    ])

    useEffect(() => {
        if (!roomId) {
            return
        }

        const loadProjectFiles = async () => {
            try {
                const files = (await projectService.listFiles(roomId)) as ProjectFileRecord[]
                const children = buildFileTree(files)
                replaceProjectTree(children)
            } catch (error: any) {
                toast.error(error?.response?.data?.message || "Failed to load project files")
            }
        }

        void loadProjectFiles()
    }, [replaceProjectTree, roomId])

    if (status === USER_STATUS.CONNECTION_FAILED) {
        return <ConnectionStatusPage />
    }

    return (
        <SplitterComponent>
            <Sidebar />
            <WorkSpace/>
        </SplitterComponent>
    )
}

export default EditorPage
