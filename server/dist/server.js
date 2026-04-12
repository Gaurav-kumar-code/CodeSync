"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_1 = require("./types/socket");
const user_1 = require("./types/user");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const executionService_1 = require("./services/executionService");
const reactPreviewBundlerService_1 = require("./services/reactPreviewBundlerService");
const previewAssetStore_1 = require("./services/previewAssetStore");
const previewLiveStore_1 = require("./services/previewLiveStore");
const copilotRoutes_1 = __importDefault(require("./routes/copilotRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "20mb" }));
app.use((0, cors_1.default)());
app.use("/api", copilotRoutes_1.default);
app.post("/api/run-code", async (req, res) => {
    try {
        const { code, language, input, files } = req.body;
        if (!code || !language) {
            return res.status(400).json({ error: "Code and language required" });
        }
        const response = await (0, executionService_1.runOneCompiler)({
            code,
            language,
            input,
            files,
        });
        res.json(response);
    }
    catch (error) {
        console.error("Execution Error:", error?.response?.data || error.message);
        res.status(500).json({
            error: error?.response?.data || "Execution failed",
        });
    }
});
app.post("/api/evaluate-code", async (req, res) => {
    try {
        const { code, language, testCases, mode, files, } = req.body;
        if (!code || !language) {
            return res.status(400).json({ error: "Code and language required" });
        }
        if (!Array.isArray(testCases) || testCases.length === 0) {
            return res
                .status(400)
                .json({ error: "At least one test case is required" });
        }
        if (mode !== "run" && mode !== "submit") {
            return res.status(400).json({ error: "Mode must be run or submit" });
        }
        const result = await (0, executionService_1.evaluateAgainstTestCases)({
            code,
            language,
            testCases,
            mode,
            files,
        });
        return res.json(result);
    }
    catch (error) {
        console.error("Evaluate Error:", error?.response?.data || error.message);
        return res.status(500).json({
            error: error?.response?.data || "Evaluation failed",
        });
    }
});
app.post("/api/preview-react", async (req, res) => {
    try {
        const { fileTree, entryFilePath, debug, liveSessionId } = req.body;
        if (!fileTree || fileTree.type !== "directory") {
            return res.status(400).json({
                error: "A valid directory-based fileTree is required",
            });
        }
        const forwardedProto = req.header("x-forwarded-proto");
        const proto = forwardedProto ? forwardedProto.split(",")[0] : req.protocol;
        const host = req.header("x-forwarded-host") || req.header("host");
        const assetBaseUrl = host
            ? `${proto}://${host}`
            : process.env.PREVIEW_ASSET_BASE_URL || "  ";
        const preview = await (0, reactPreviewBundlerService_1.bundleReactPreview)({
            fileTree,
            entryFilePath,
            assetBaseUrl,
            debug: Boolean(debug),
            liveSessionId,
        });
        if (liveSessionId) {
            (0, previewLiveStore_1.setLivePreview)(liveSessionId, {
                html: preview.html,
                entryFilePath: preview.entryFilePath,
            });
        }
        return res.json(preview);
    }
    catch (error) {
        console.error("Preview Error:", error?.message || error, error?.details || "");
        return res.status(400).json({
            error: error?.message || "Failed to generate preview",
            details: error?.details || null,
        });
    }
});
app.get("/api/preview-live/:liveSessionId/data", (req, res) => {
    const { liveSessionId } = req.params;
    if (!/^[a-zA-Z0-9_-]{8,120}$/.test(liveSessionId)) {
        return res.status(400).json({ error: "Invalid live preview id" });
    }
    const preview = (0, previewLiveStore_1.getLivePreview)(liveSessionId);
    if (!preview) {
        return res.status(404).json({ error: "Live preview not found" });
    }
    return res.json(preview);
});
app.get("/api/preview-live/:liveSessionId", (req, res) => {
    const { liveSessionId } = req.params;
    if (!/^[a-zA-Z0-9_-]{8,120}$/.test(liveSessionId)) {
        return res.status(400).send("Invalid live preview id");
    }
    const escapedSessionId = JSON.stringify(liveSessionId);
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
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(html);
});
app.get("/api/asset/:previewId", (req, res) => {
    const { previewId } = req.params;
    const requestedPath = typeof req.query.path === "string" ? req.query.path : "";
    if (!/^[a-f0-9]{12,64}$/i.test(previewId)) {
        return res.status(400).json({ error: "Invalid preview id" });
    }
    if (!requestedPath) {
        return res.status(400).json({ error: "Asset path is required" });
    }
    const asset = (0, previewAssetStore_1.getPreviewAsset)(previewId, requestedPath);
    if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
    }
    res.setHeader("Content-Type", asset.mimeType);
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).send(asset.content);
});
app.use(express_1.default.static(path_1.default.join(__dirname, "public"))); // Serve static files
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
    maxHttpBufferSize: 1e8,
    pingTimeout: 60000,
});
let userSocketMap = [];
// Function to get all users in a room
function getUsersInRoom(roomId) {
    return userSocketMap.filter((user) => user.roomId == roomId);
}
// Function to get room id by socket id
function getRoomId(socketId) {
    const roomId = userSocketMap.find((user) => user.socketId === socketId)?.roomId;
    if (!roomId) {
        console.error("Room ID is undefined for socket ID:", socketId);
        return null;
    }
    return roomId;
}
function getUserBySocketId(socketId) {
    const user = userSocketMap.find((user) => user.socketId === socketId);
    if (!user) {
        console.error("User not found for socket ID:", socketId);
        return null;
    }
    return user;
}
io.on("connection", (socket) => {
    // Handle user actions
    socket.on(socket_1.SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
        // Check is username exist in the room
        const isUsernameExist = getUsersInRoom(roomId).filter((u) => u.username === username);
        if (isUsernameExist.length > 0) {
            io.to(socket.id).emit(socket_1.SocketEvent.USERNAME_EXISTS);
            return;
        }
        const user = {
            username,
            roomId,
            status: user_1.USER_CONNECTION_STATUS.ONLINE,
            cursorPosition: 0,
            typing: false,
            socketId: socket.id,
            currentFile: null,
        };
        userSocketMap.push(user);
        socket.join(roomId);
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.USER_JOINED, { user });
        const users = getUsersInRoom(roomId);
        io.to(socket.id).emit(socket_1.SocketEvent.JOIN_ACCEPTED, { user, users });
    });
    socket.on("disconnecting", () => {
        const user = getUserBySocketId(socket.id);
        if (!user)
            return;
        const roomId = user.roomId;
        socket.broadcast
            .to(roomId)
            .emit(socket_1.SocketEvent.USER_DISCONNECTED, { user });
        userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id);
        socket.leave(roomId);
    });
    // Handle file actions
    socket.on(socket_1.SocketEvent.SYNC_FILE_STRUCTURE, ({ fileStructure, openFiles, activeFile, socketId }) => {
        io.to(socketId).emit(socket_1.SocketEvent.SYNC_FILE_STRUCTURE, {
            fileStructure,
            openFiles,
            activeFile,
        });
    });
    socket.on(socket_1.SocketEvent.DIRECTORY_CREATED, ({ parentDirId, newDirectory }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.DIRECTORY_CREATED, {
            parentDirId,
            newDirectory,
        });
    });
    socket.on(socket_1.SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.DIRECTORY_UPDATED, {
            dirId,
            children,
        });
    });
    socket.on(socket_1.SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.DIRECTORY_RENAMED, {
            dirId,
            newName,
        });
    });
    socket.on(socket_1.SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast
            .to(roomId)
            .emit(socket_1.SocketEvent.DIRECTORY_DELETED, { dirId });
    });
    socket.on(socket_1.SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast
            .to(roomId)
            .emit(socket_1.SocketEvent.FILE_CREATED, { parentDirId, newFile });
    });
    socket.on(socket_1.SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.FILE_UPDATED, {
            fileId,
            newContent,
        });
    });
    socket.on(socket_1.SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.FILE_RENAMED, {
            fileId,
            newName,
        });
    });
    socket.on(socket_1.SocketEvent.FILE_DELETED, ({ fileId }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.FILE_DELETED, { fileId });
    });
    // Handle user status
    socket.on(socket_1.SocketEvent.USER_OFFLINE, ({ socketId }) => {
        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socketId) {
                return { ...user, status: user_1.USER_CONNECTION_STATUS.OFFLINE };
            }
            return user;
        });
        const roomId = getRoomId(socketId);
        if (!roomId)
            return;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.USER_OFFLINE, { socketId });
    });
    socket.on(socket_1.SocketEvent.USER_ONLINE, ({ socketId }) => {
        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socketId) {
                return { ...user, status: user_1.USER_CONNECTION_STATUS.ONLINE };
            }
            return user;
        });
        const roomId = getRoomId(socketId);
        if (!roomId)
            return;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.USER_ONLINE, { socketId });
    });
    // Handle chat actions
    socket.on(socket_1.SocketEvent.SEND_MESSAGE, ({ message }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast
            .to(roomId)
            .emit(socket_1.SocketEvent.RECEIVE_MESSAGE, { message });
    });
    // Handle cursor position and selection
    socket.on(socket_1.SocketEvent.TYPING_START, ({ cursorPosition, selectionStart, selectionEnd }) => {
        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socket.id) {
                return {
                    ...user,
                    typing: true,
                    cursorPosition,
                    selectionStart,
                    selectionEnd
                };
            }
            return user;
        });
        const user = getUserBySocketId(socket.id);
        if (!user)
            return;
        const roomId = user.roomId;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.TYPING_START, { user });
    });
    socket.on(socket_1.SocketEvent.TYPING_PAUSE, () => {
        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socket.id) {
                return { ...user, typing: false };
            }
            return user;
        });
        const user = getUserBySocketId(socket.id);
        if (!user)
            return;
        const roomId = user.roomId;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.TYPING_PAUSE, { user });
    });
    // Handle cursor movement without typing
    socket.on(socket_1.SocketEvent.CURSOR_MOVE, ({ cursorPosition, selectionStart, selectionEnd }) => {
        userSocketMap = userSocketMap.map((user) => {
            if (user.socketId === socket.id) {
                return {
                    ...user,
                    cursorPosition,
                    selectionStart,
                    selectionEnd
                };
            }
            return user;
        });
        const user = getUserBySocketId(socket.id);
        if (!user)
            return;
        const roomId = user.roomId;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.CURSOR_MOVE, { user });
    });
    socket.on(socket_1.SocketEvent.REQUEST_DRAWING, () => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast
            .to(roomId)
            .emit(socket_1.SocketEvent.REQUEST_DRAWING, { socketId: socket.id });
    });
    socket.on(socket_1.SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
        socket.broadcast
            .to(socketId)
            .emit(socket_1.SocketEvent.SYNC_DRAWING, { drawingData });
    });
    socket.on(socket_1.SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
        const roomId = getRoomId(socket.id);
        if (!roomId)
            return;
        socket.broadcast.to(roomId).emit(socket_1.SocketEvent.DRAWING_UPDATE, {
            snapshot,
        });
    });
});
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
    // Send the index.html file
    res.sendFile(path_1.default.join(__dirname, "..", "public", "index.html"));
});
server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
