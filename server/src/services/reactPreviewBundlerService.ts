import crypto from "crypto"
import * as esbuild from "esbuild"
import { setPreviewAssets } from "./previewAssetStore"
import {
    PreviewFileTreeNode,
    flattenFileTree,
    getEsbuildLoader,
    guessEntryFile,
    isAssetPath,
    normalizeVirtualPath,
    resolveVirtualImport,
    toAssetModuleUrl,
} from "./previewVirtualFileSystem"

type BundleReactPreviewParams = {
    fileTree: PreviewFileTreeNode
    entryFilePath?: string
    assetBaseUrl: string
    debug?: boolean
    liveSessionId?: string
}

type PreviewDebugInfo = {
    entryFilePath: string
    moduleCount: number
    assetCount: number
    resolveAttempts: number
    resolvedImports: number
    failedResolutions: Array<{
        importPath: string
        importer: string
    }>
    externalImports: string[]
}

type BundledReactPreview = {
    html: string
    bundledCode: string
    entryFilePath: string
    previewId: string
    fromCache: boolean
    liveSessionId?: string
    livePreviewUrl?: string
    debugInfo?: PreviewDebugInfo
}

type PreviewBundleError = Error & {
    details?: PreviewDebugInfo
}

const PREVIEW_CACHE_LIMIT = 50
const previewCache = new Map<string, BundledReactPreview>()

const hashBundleInput = (
    modules: Map<string, string>,
    entryFilePath: string,
    assetBaseUrl: string,
) => {
    const hash = crypto.createHash("sha256")
    hash.update(entryFilePath)
    hash.update(assetBaseUrl)

    for (const [path, content] of Array.from(modules.entries()).sort(([a], [b]) =>
        a.localeCompare(b),
    )) {
        hash.update(path)
        hash.update(content)
    }

    return hash.digest("hex")
}

const collectPreviewAssets = (modules: Map<string, string>) => {
    const assets = new Map<string, string>()

    for (const [filePath, content] of modules.entries()) {
        if (isAssetPath(filePath)) {
            assets.set(filePath, content)
        }
    }

    return assets
}

const buildPreviewHtml = (bundledCode: string, bundledCss: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Code Sync React Preview</title>
    <style>
      html, body, #root { margin: 0; padding: 0; height: 100%; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #f7f7fb; }
      #root { min-height: 100%; }
      .preview-runtime-error {
        margin: 0;
        padding: 12px;
        color: #b91c1c;
        white-space: pre-wrap;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
    </style>
    <style>
${bundledCss}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      window.addEventListener("error", (event) => {
        const root = document.getElementById("root");
        if (!root) return;
        root.innerHTML = '<pre class="preview-runtime-error">' + (event.error?.message || event.message || "Runtime error") + '</pre>';
      });

      window.addEventListener("unhandledrejection", (event) => {
        const root = document.getElementById("root");
        if (!root) return;
        root.innerHTML = '<pre class="preview-runtime-error">' + (event.reason?.message || event.reason || "Unhandled promise rejection") + '</pre>';
      });

${bundledCode}
    </script>
  </body>
</html>`

const bundleReactPreview = async ({
    fileTree,
    entryFilePath,
    assetBaseUrl,
    debug = false,
    liveSessionId,
}: BundleReactPreviewParams): Promise<BundledReactPreview> => {
    const modules = flattenFileTree(fileTree)

    if (!modules.size) {
        throw new Error("Project tree is empty. Add React source files to preview.")
    }

    const resolvedEntryFile = guessEntryFile(modules, entryFilePath)
    const cacheKey = hashBundleInput(modules, resolvedEntryFile, assetBaseUrl)
    const previewId = cacheKey.slice(0, 24)
    const previewAssets = collectPreviewAssets(modules)
    const debugInfo: PreviewDebugInfo = {
        entryFilePath: resolvedEntryFile,
        moduleCount: modules.size,
        assetCount: previewAssets.size,
        resolveAttempts: 0,
        resolvedImports: 0,
        failedResolutions: [],
        externalImports: [],
    }
    const cached = previewCache.get(cacheKey)

    if (cached) {
        setPreviewAssets(previewId, previewAssets)
        return {
            ...cached,
            previewId,
            fromCache: true,
            liveSessionId,
            livePreviewUrl: liveSessionId
                ? `${assetBaseUrl}/api/preview-live/${encodeURIComponent(liveSessionId)}`
                : undefined,
            debugInfo: debug ? cached.debugInfo || debugInfo : undefined,
        }
    }

    setPreviewAssets(previewId, previewAssets)

    const virtualPlugin: esbuild.Plugin = {
        name: "codesync-virtual-fs",
        setup(build) {
            build.onResolve({ filter: /.*/ }, (args) => {
                debugInfo.resolveAttempts += 1

                if (
                    args.path.startsWith("https://") ||
                    args.path.startsWith("http://") ||
                    args.path.startsWith("data:")
                ) {
                    debugInfo.externalImports.push(args.path)
                    return { path: args.path, external: true }
                }

                if (args.path.startsWith(".") || args.path.startsWith("/")) {
                    const isFromEntryShim =
                        !args.importer || args.importer.includes("__entry__")

                    // Absolute import from the synthetic entry shim — look up directly in modules
                    if (isFromEntryShim && args.path.startsWith("/")) {
                        const normalized = normalizeVirtualPath(args.path)
                        if (modules.has(normalized)) {
                            debugInfo.resolvedImports += 1
                            if (isAssetPath(normalized)) {
                                return { path: normalized, namespace: "vfs-asset" }
                            }
                            return { path: normalized, namespace: "vfs-code" }
                        }
                        // Not found in modules
                        debugInfo.failedResolutions.push({
                            importPath: args.path,
                            importer: "/__entry__.tsx",
                        })
                        return {
                            errors: [
                                {
                                    text: `Cannot resolve entry module '${args.path}' in virtual file system`,
                                },
                            ],
                        }
                    }

                    // Relative or absolute import from a real virtual module
                    const importer = isFromEntryShim
                        ? resolvedEntryFile
                        : normalizeVirtualPath(args.importer)

                    const resolved = resolveVirtualImport(args.path, importer, modules)

                    if (!resolved) {
                        debugInfo.failedResolutions.push({
                            importPath: args.path,
                            importer,
                        })
                        return {
                            errors: [
                                {
                                    text: `Cannot resolve import '${args.path}' from '${importer}'`,
                                },
                            ],
                        }
                    }

                    debugInfo.resolvedImports += 1

                    if (isAssetPath(resolved)) {
                        return { path: resolved, namespace: "vfs-asset" }
                    }

                    return { path: resolved, namespace: "vfs-code" }
                }

                // Bare specifier — route to esm.sh
                debugInfo.externalImports.push(args.path)
                return {
                    path: `https://esm.sh/${args.path}`,
                    external: true,
                }
            })

            build.onLoad({ filter: /.*/, namespace: "vfs-code" }, (args) => {
                const contents = modules.get(normalizeVirtualPath(args.path))

                if (contents === undefined) {
                    return {
                        errors: [
                            {
                                text: `Virtual module not found: ${args.path}`,
                            },
                        ],
                    }
                }

                return {
                    contents,
                    loader: getEsbuildLoader(args.path),
                }
            })

            build.onLoad({ filter: /.*/, namespace: "vfs-asset" }, (args) => {
                const assetUrl = toAssetModuleUrl(assetBaseUrl, previewId, args.path)

                return {
                    contents: `export default ${JSON.stringify(assetUrl)};`,
                    loader: "js",
                }
            })
        },
    }

    let bundledCode = ""
    let bundledCss = ""

    try {
        const buildResult = await esbuild.build({
            stdin: {
                // Absolute path import — handled directly in onResolve without resolveVirtualImport
                contents: `import "${resolvedEntryFile}";`,
                sourcefile: "/__entry__.tsx",
                resolveDir: "/",
                loader: "tsx",
            },
            outdir: "/preview-out",
            write: false,
            bundle: true,
            format: "esm",
            platform: "browser",
            target: ["es2020"],
            jsx: "automatic",
            plugins: [virtualPlugin],
            sourcemap: "inline",
            logLevel: "silent",
        })

        const outputFiles = buildResult.outputFiles || []
        const jsOutput =
            outputFiles.find((outputFile) => outputFile.path.endsWith(".js")) ||
            outputFiles[0]
        const cssOutputs = outputFiles
            .filter((outputFile) => outputFile.path.endsWith(".css"))
            .map((outputFile) => outputFile.text)

        bundledCode = jsOutput?.text || ""
        bundledCss = cssOutputs.join("\n")
    } catch (error: any) {
        const errors = error?.errors?.map((entry: any) => entry.text).join("\n")
        const previewError: PreviewBundleError = new Error(
            errors || error?.message || "Failed to bundle React preview",
        )
        previewError.details = debugInfo
        throw previewError
    }

    const result: BundledReactPreview = {
        html: buildPreviewHtml(bundledCode, bundledCss),
        bundledCode,
        entryFilePath: resolvedEntryFile,
        previewId,
        fromCache: false,
        liveSessionId,
        livePreviewUrl: liveSessionId
            ? `${assetBaseUrl}/api/preview-live/${encodeURIComponent(liveSessionId)}`
            : undefined,
        debugInfo: debug ? debugInfo : undefined,
    }

    previewCache.set(cacheKey, result)

    if (previewCache.size > PREVIEW_CACHE_LIMIT) {
        const firstKey = previewCache.keys().next().value
        if (firstKey) {
            previewCache.delete(firstKey)
        }
    }

    return result
}

export { bundleReactPreview }