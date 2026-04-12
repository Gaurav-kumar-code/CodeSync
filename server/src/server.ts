import express, { Response, Request } from "express"
import dotenv from "dotenv"
import http from "http"
import cors from "cors"
import { SocketEvent, SocketId } from "./types/socket"
import { USER_CONNECTION_STATUS, User } from "./types/user"
import { Server } from "socket.io"
import path from "path"
import {
	evaluateAgainstTestCases,
	runOneCompiler,
	TestCase,
} from "./services/executionService"
import {
	bundleReactPreview,
} from "./services/reactPreviewBundlerService"
import { PreviewFileTreeNode } from "./services/previewVirtualFileSystem"
import { getPreviewAsset } from "./services/previewAssetStore"
import { getLivePreview, setLivePreview } from "./services/previewLiveStore"

dotenv.config()

const app = express()

app.use(express.json({ limit: "20mb" }))

app.use(cors())
app.post("/api/run-code", async (req: Request, res: Response) => {
  try {
    const { code, language, input, files } = req.body

    if (!code || !language) {
      return res.status(400).json({ error: "Code and language required" })
    }

    const response = await runOneCompiler({
		code,
		language,
		input,
		files,
	})

    res.json(response)
  } catch (error: any) {
    console.error("Execution Error:", error?.response?.data || error.message)

    res.status(500).json({
      error: error?.response?.data || "Execution failed",
    })
  }
})

app.post("/api/evaluate-code", async (req: Request, res: Response) => {
	try {
		const {
			code,
			language,
			testCases,
			mode,
			files,
		}: {
			code: string
			language: string
			testCases: TestCase[]
			mode: "run" | "submit"
			files?: Array<{ name: string; content: string }>
		} = req.body

		if (!code || !language) {
			return res.status(400).json({ error: "Code and language required" })
		}

		if (!Array.isArray(testCases) || testCases.length === 0) {
			return res
				.status(400)
				.json({ error: "At least one test case is required" })
		}

		if (mode !== "run" && mode !== "submit") {
			return res.status(400).json({ error: "Mode must be run or submit" })
		}

		const result = await evaluateAgainstTestCases({
			code,
			language,
			testCases,
			mode,
			files,
		})

		return res.json(result)
	} catch (error: any) {
		console.error("Evaluate Error:", error?.response?.data || error.message)

		return res.status(500).json({
			error: error?.response?.data || "Evaluation failed",
		})
	}
})

app.post("/api/preview-react", async (req: Request, res: Response) => {
	try {
		const { fileTree, entryFilePath, debug, liveSessionId } = req.body as {
			fileTree: PreviewFileTreeNode
			entryFilePath?: string
			debug?: boolean
			liveSessionId?: string
		}

		if (!fileTree || fileTree.type !== "directory") {
			return res.status(400).json({
				error: "A valid directory-based fileTree is required",
			})
		}

		const forwardedProto = req.header("x-forwarded-proto")
		const proto = forwardedProto ? forwardedProto.split(",")[0] : req.protocol
		const host = req.header("x-forwarded-host") || req.header("host")
		const assetBaseUrl = host
			? `${proto}://${host}`
			: process.env.PREVIEW_ASSET_BASE_URL || "  "

		const preview = await bundleReactPreview({
			fileTree,
			entryFilePath,
			assetBaseUrl,
			debug: Boolean(debug),
			liveSessionId,
		})

		if (liveSessionId) {
			setLivePreview(liveSessionId, {
				html: preview.html,
				entryFilePath: preview.entryFilePath,
			})
		}

		return res.json(preview)
	} catch (error: any) {
		console.error("Preview Error:", error?.message || error, error?.details || "")
		return res.status(400).json({
			error: error?.message || "Failed to generate preview",
			details: error?.details || null,
		})
	}
})

app.get("/api/preview-live/:liveSessionId/data", (req: Request, res: Response) => {
	const { liveSessionId } = req.params

	if (!/^[a-zA-Z0-9_-]{8,120}$/.test(liveSessionId)) {
		return res.status(400).json({ error: "Invalid live preview id" })
	}

	const preview = getLivePreview(liveSessionId)

	if (!preview) {
		return res.status(404).json({ error: "Live preview not found" })
	}

	return res.json(preview)
})

app.get("/api/preview-live/:liveSessionId", (req: Request, res: Response) => {
	const { liveSessionId } = req.params

	if (!/^[a-zA-Z0-9_-]{8,120}$/.test(liveSessionId)) {
		return res.status(400).send("Invalid live preview id")
	}

	const escapedSessionId = JSON.stringify(liveSessionId)
	const html = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>CodeSync Live Preview</title>
		<style>
			:root {
				color-scheme: light;
			}
			* {
				box-sizing: border-box;
			}
			html,
			body {
				margin: 0;
				padding: 0;
				height: 100%;
				background: #eef1f7;
				font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
			}
			.shell {
				display: flex;
				flex-direction: column;
				height: 100%;
			}
			.status {
				height: 36px;
				padding: 0 12px;
				display: flex;
				align-items: center;
				gap: 10px;
				border-bottom: 1px solid #d7ddea;
				background: linear-gradient(90deg, #ffffff, #f4f7ff);
				color: #1d2942;
				font-size: 13px;
			}
			.dot {
				width: 8px;
				height: 8px;
				border-radius: 50%;
				background: #10b981;
				box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
			}
			.status.offline .dot {
				background: #ef4444;
				box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12);
			}
			iframe {
				flex: 1;
				width: 100%;
				border: 0;
				background: #fff;
			}
		</style>
	</head>
	<body>
		<div class="shell">
			<div id="status" class="status offline">
				<span class="dot"></span>
				<span id="statusText">Waiting for first preview build...</span>
			</div>
			<iframe id="previewFrame" title="Live Preview" sandbox="allow-scripts"></iframe>
		</div>
		<script>
			const liveSessionId = ${escapedSessionId};
			const status = document.getElementById("status");
			const statusText = document.getElementById("statusText");
			const previewFrame = document.getElementById("previewFrame");
			let lastUpdatedAt = 0;

			const updateStatus = (text, online) => {
				statusText.textContent = text;
				status.classList.toggle("offline", !online);
			};

			const fetchPreview = async () => {
				try {
					const response = await fetch("/api/preview-live/" + liveSessionId + "/data", {
						cache: "no-store",
					});

					if (!response.ok) {
						if (response.status === 404) {
							updateStatus("Waiting for first preview build...", false);
							return;
						}
						throw new Error("HTTP " + response.status);
					}

					const payload = await response.json();
					const updatedAt = Number(payload.updatedAt) || 0;

					if (updatedAt && updatedAt !== lastUpdatedAt && typeof payload.html === "string") {
						previewFrame.srcdoc = payload.html;
						lastUpdatedAt = updatedAt;
					}

					const entryName = payload.entryFilePath || "entry file";
					updateStatus("Live updates active (" + entryName + ")", true);
				} catch (error) {
					updateStatus("Connection issue. Retrying...", false);
				}
			};

			fetchPreview();
			setInterval(fetchPreview, 1000);
		</script>
	</body>
</html>`

	res.setHeader("Content-Type", "text/html; charset=utf-8")
	res.setHeader("Cache-Control", "no-store")
	return res.status(200).send(html)
})

app.get("/api/asset/:previewId", (req: Request, res: Response) => {
	const { previewId } = req.params
	const requestedPath =
		typeof req.query.path === "string" ? req.query.path : ""

	if (!/^[a-f0-9]{12,64}$/i.test(previewId)) {
		return res.status(400).json({ error: "Invalid preview id" })
	}

	if (!requestedPath) {
		return res.status(400).json({ error: "Asset path is required" })
	}

	const asset = getPreviewAsset(previewId, requestedPath)

	if (!asset) {
		return res.status(404).json({ error: "Asset not found" })
	}

	res.setHeader("Content-Type", asset.mimeType)
	res.setHeader("Cache-Control", "public, max-age=300")
	return res.status(200).send(asset.content)
})

app.use(express.static(path.join(__dirname, "public"))) // Serve static files

const server = http.createServer(app)
const io = new Server(server, {
	cors: {
		origin: "*",
	},
	maxHttpBufferSize: 1e8,
	pingTimeout: 60000,
})

let userSocketMap: User[] = []

// Function to get all users in a room
function getUsersInRoom(roomId: string): User[] {
	return userSocketMap.filter((user) => user.roomId == roomId)
}

// Function to get room id by socket id
function getRoomId(socketId: SocketId): string | null {
	const roomId = userSocketMap.find(
		(user) => user.socketId === socketId
	)?.roomId

	if (!roomId) {
		console.error("Room ID is undefined for socket ID:", socketId)
		return null
	}
	return roomId
}

function getUserBySocketId(socketId: SocketId): User | null {
	const user = userSocketMap.find((user) => user.socketId === socketId)
	if (!user) {
		console.error("User not found for socket ID:", socketId)
		return null
	}
	return user
}

io.on("connection", (socket) => {
	// Handle user actions
	socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
		// Check is username exist in the room
		const isUsernameExist = getUsersInRoom(roomId).filter(
			(u) => u.username === username
		)
		if (isUsernameExist.length > 0) {
			io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS)
			return
		}

		const user = {
			username,
			roomId,
			status: USER_CONNECTION_STATUS.ONLINE,
			cursorPosition: 0,
			typing: false,
			socketId: socket.id,
			currentFile: null,
		}
		userSocketMap.push(user)
		socket.join(roomId)
		socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user })
		const users = getUsersInRoom(roomId)
		io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users })
	})

	socket.on("disconnecting", () => {
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.USER_DISCONNECTED, { user })
		userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id)
		socket.leave(roomId)
	})

	// Handle file actions
	socket.on(
		SocketEvent.SYNC_FILE_STRUCTURE,
		({ fileStructure, openFiles, activeFile, socketId }) => {
			io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
				fileStructure,
				openFiles,
				activeFile,
			})
		}
	)

	socket.on(
		SocketEvent.DIRECTORY_CREATED,
		({ parentDirId, newDirectory }) => {
			const roomId = getRoomId(socket.id)
			if (!roomId) return
			socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, {
				parentDirId,
				newDirectory,
			})
		}
	)

	socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, {
			dirId,
			children,
		})
	})

	socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_RENAMED, {
			dirId,
			newName,
		})
	})

	socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.DIRECTORY_DELETED, { dirId })
	})

	socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.FILE_CREATED, { parentDirId, newFile })
	})

	socket.on(SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.FILE_UPDATED, {
			fileId,
			newContent,
		})
	})

	socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.FILE_RENAMED, {
			fileId,
			newName,
		})
	})

	socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId })
	})

	// Handle user status
	socket.on(SocketEvent.USER_OFFLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: USER_CONNECTION_STATUS.OFFLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.USER_OFFLINE, { socketId })
	})

	socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socketId) {
				return { ...user, status: USER_CONNECTION_STATUS.ONLINE }
			}
			return user
		})
		const roomId = getRoomId(socketId)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId })
	})

	// Handle chat actions
	socket.on(SocketEvent.SEND_MESSAGE, ({ message }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.RECEIVE_MESSAGE, { message })
	})

	// Handle cursor position and selection
	socket.on(SocketEvent.TYPING_START, ({ cursorPosition, selectionStart, selectionEnd }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return {
					...user,
					typing: true,
					cursorPosition,
					selectionStart,
					selectionEnd
				}
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(SocketEvent.TYPING_START, { user })
	})

	socket.on(SocketEvent.TYPING_PAUSE, () => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return { ...user, typing: false }
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(SocketEvent.TYPING_PAUSE, { user })
	})

	// Handle cursor movement without typing
	socket.on(SocketEvent.CURSOR_MOVE, ({ cursorPosition, selectionStart, selectionEnd }) => {
		userSocketMap = userSocketMap.map((user) => {
			if (user.socketId === socket.id) {
				return {
					...user,
					cursorPosition,
					selectionStart,
					selectionEnd
				}
			}
			return user
		})
		const user = getUserBySocketId(socket.id)
		if (!user) return
		const roomId = user.roomId
		socket.broadcast.to(roomId).emit(SocketEvent.CURSOR_MOVE, { user })
	})

	socket.on(SocketEvent.REQUEST_DRAWING, () => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast
			.to(roomId)
			.emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id })
	})

	socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
		socket.broadcast
			.to(socketId)
			.emit(SocketEvent.SYNC_DRAWING, { drawingData })
	})

	socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
		const roomId = getRoomId(socket.id)
		if (!roomId) return
		socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, {
			snapshot,
		})
	})
})

const PORT = process.env.PORT || 3000

app.get("/", (req: Request, res: Response) => {
	// Send the index.html file
	res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`)
})
