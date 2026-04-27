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
(0, security_1.applySecurityMiddleware)(app);
app.use(requestLogger_1.requestLogger);
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
        const assetBaseUrl = host ? `${proto}://${host}` : env_1.env.previewAssetBaseUrl || "";
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
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      html, body {
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
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.get("/", (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, "..", "public", "index.html"));
});
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: env_1.env.corsOrigin,
        credentials: true,
    },
    maxHttpBufferSize: env_1.env.maxFileSize,
    pingTimeout: 60000,
});
(0, socketService_1.registerSocketHandlers)(io);
const startServer = async () => {
    let databaseConnected = false;
    try {
        await (0, database_1.connectDatabase)();
        databaseConnected = true;
    }
    catch (error) {
        if (!env_1.env.allowNoDbStartup) {
            throw error;
        }
        mongoose_1.default.set("bufferCommands", false);
        console.warn("Database connection failed; continuing startup without DB connectivity.");
        console.warn("Set ALLOW_NO_DB_STARTUP=false to enforce strict startup.");
        console.warn(error);
    }
    server.listen(env_1.env.port, () => {
        console.log(`Listening on port ${env_1.env.port}`);
        console.log(`Database connected: ${databaseConnected}`);
    });
};
startServer().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
});
