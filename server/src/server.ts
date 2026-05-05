import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import mongoose from "mongoose";

import { env } from "./config/env";
import { connectDatabase } from "./config/database";
import { applySecurityMiddleware } from "./middleware/security";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";
import { registerSocketHandlers } from "./services/socketService";
import { bundleReactPreview } from "./services/reactPreviewBundlerService";
import { PreviewFileTreeNode } from "./services/previewVirtualFileSystem";
import { getPreviewAsset } from "./services/previewAssetStore";
import { getLivePreview, setLivePreview } from "./services/previewLiveStore";

const app = express();

// ✅ FIX 1: correct usage (NOT app.use)
applySecurityMiddleware(app);

// ✅ FIX 2: logger should be middleware
app.use(requestLogger);

// ---------------- ROUTES ----------------

app.use("/api", apiRouter);

app.post("/api/preview-react", async (req: Request, res: Response) => {
  try {
    const { fileTree, entryFilePath, debug, liveSessionId } = req.body as {
      fileTree: PreviewFileTreeNode;
      entryFilePath?: string;
      debug?: boolean;
      liveSessionId?: string;
    };

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
      : env.previewAssetBaseUrl || "";

    const preview = await bundleReactPreview({
      fileTree,
      entryFilePath,
      assetBaseUrl,
      debug: Boolean(debug),
      liveSessionId,
    });

    const resolvedLiveSessionId = liveSessionId || preview.previewId;

    setLivePreview(resolvedLiveSessionId, {
      html: preview.html,
      entryFilePath: preview.entryFilePath,
    });

    return res.json({
      ...preview,
      liveSessionId: resolvedLiveSessionId,
      livePreviewUrl: `${assetBaseUrl}/api/preview-live/${encodeURIComponent(
        resolvedLiveSessionId
      )}`,
    });
  } catch (error: any) {
    console.error("Preview Error:", error?.message || error);
    return res.status(400).json({
      error: error?.message || "Failed to generate preview",
    });
  }
});

// ---------------- LIVE PREVIEW ----------------

app.get("/api/preview-live/:liveSessionId/data", (req: Request, res: Response) => {
  const { liveSessionId } = req.params;

  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(liveSessionId)) {
    return res.status(400).json({ error: "Invalid live preview id" });
  }

  const preview = getLivePreview(liveSessionId);

  if (!preview) {
    return res.status(404).json({ error: "Live preview not found" });
  }

  return res.json(preview);
});

app.get("/api/preview-live/:liveSessionId", (req: Request, res: Response) => {
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

app.get("/api/asset/:previewId", (req: Request, res: Response) => {
  const { previewId } = req.params;
  const requestedPath =
    typeof req.query.path === "string" ? req.query.path : "";

  const asset = getPreviewAsset(previewId, requestedPath);

  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }

  res.setHeader("Content-Type", asset.mimeType);
  return res.send(asset.content);
});

// ---------------- STATIC ----------------

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req: Request, res: Response) => {
  res.send("Server running 🚀"); // ✅ Render health check
});

// ---------------- ERROR HANDLING ----------------

app.use(notFoundHandler);
app.use(errorHandler);

// ---------------- SOCKET ----------------

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.corsOrigin,
    credentials: true,
  },
});

registerSocketHandlers(io);

// ---------------- START SERVER ----------------

const startServer = async () => {
  let databaseConnected = false;

  try {
    await connectDatabase();
    databaseConnected = true;
  } catch (error) {
    if (!env.allowNoDbStartup) throw error;

    mongoose.set("bufferCommands", false);
    console.warn("DB failed, continuing without DB");
  }

  const PORT = process.env.PORT || env.port || 5000; // ✅ FIX

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database connected: ${databaseConnected}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});