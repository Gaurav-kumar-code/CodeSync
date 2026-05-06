"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const security_1 = require("./middleware/security");
const requestLogger_1 = require("./middleware/requestLogger");
const errorHandler_1 = require("./middleware/errorHandler");
const routes_1 = require("./routes");
const socketService_1 = require("./services/socketService");
const reactPreviewBundlerService_1 = require("./services/reactPreviewBundlerService");
const previewAssetStore_1 = require("./services/previewAssetStore");
const previewLiveStore_1 = require("./services/previewLiveStore");
const app = (0, express_1.default)();
// ✅ FIX 1: correct usage (NOT app.use)
(0, security_1.applySecurityMiddleware)(app);
// ✅ FIX 2: logger should be middleware
app.use(requestLogger_1.requestLogger);
// ---------------- ROUTES ----------------
app.use("/api", routes_1.apiRouter);
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
            : env_1.env.previewAssetBaseUrl || "";
        const preview = await (0, reactPreviewBundlerService_1.bundleReactPreview)({
            fileTree,
            entryFilePath,
            assetBaseUrl,
            debug: Boolean(debug),
            liveSessionId,
        });
        const resolvedLiveSessionId = liveSessionId || preview.previewId;
        (0, previewLiveStore_1.setLivePreview)(resolvedLiveSessionId, {
            html: preview.html,
            entryFilePath: preview.entryFilePath,
        });
        return res.json({
            ...preview,
            liveSessionId: resolvedLiveSessionId,
            livePreviewUrl: `${assetBaseUrl}/api/preview-live/${encodeURIComponent(resolvedLiveSessionId)}`,
        });
    }
    catch (error) {
        console.error("Preview Error:", error?.message || error);
        return res.status(400).json({
            error: error?.message || "Failed to generate preview",
        });
    }
});
// ---------------- LIVE PREVIEW ----------------
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
<html>
<body>
<iframe id="previewFrame" style="width:100%;height:100vh;border:none;"></iframe>
<script>
  const liveSessionId = ${escapedSessionId};
  const frame = document.getElementById("previewFrame");

  const fetchPreview = async () => {
    try {
      const res = await fetch("/api/preview-live/" + liveSessionId + "/data");
      if (!res.ok) return;

      const data = await res.json();
      if (data.html) frame.srcdoc = data.html;
    } catch {}
  };

  setInterval(fetchPreview, 1000);
</script>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html");
    return res.send(html);
});
// ---------------- ASSETS ----------------
app.get("/api/asset/:previewId", (req, res) => {
    const { previewId } = req.params;
    const requestedPath = typeof req.query.path === "string" ? req.query.path : "";
    const asset = (0, previewAssetStore_1.getPreviewAsset)(previewId, requestedPath);
    if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
    }
    res.setHeader("Content-Type", asset.mimeType);
    return res.send(asset.content);
});
// ---------------- STATIC ----------------
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.get("/", (_req, res) => {
    res.send("Server running 🚀"); // ✅ Render health check
});
// ---------------- ERROR HANDLING ----------------
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// ---------------- SOCKET ----------------
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: env_1.env.corsOrigin,
        credentials: true,
    },
});
(0, socketService_1.registerSocketHandlers)(io);
// ---------------- START SERVER ----------------
const startServer = async () => {
    let databaseConnected = false;
    try {
        await (0, database_1.connectDatabase)();
        databaseConnected = true;
    }
    catch (error) {
        if (!env_1.env.allowNoDbStartup)
            throw error;
        mongoose_1.default.set("bufferCommands", false);
        console.warn("DB failed, continuing without DB");
    }
    const PORT = process.env.PORT || env_1.env.port || 5000; // ✅ FIX
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Database connected: ${databaseConnected}`);
    });
};
startServer().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
});
