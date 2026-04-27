import path from "path"

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ".js": "javascript",
  ".ts": "typescript",
  ".jsx": "javascript",
  ".tsx": "typescript",
  ".py": "python",
  ".java": "java",
  ".cpp": "cpp",
  ".c": "c",
  ".cs": "csharp",
  ".go": "go",
  ".rb": "ruby",
  ".php": "php",
  ".rs": "rust",
  ".json": "json",
  ".md": "markdown",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".sql": "sql",
  ".yml": "yaml",
  ".yaml": "yaml",
}

const detectLanguageFromFileName = (fileName: string) => {
  const extension = path.extname(fileName).toLowerCase()
  return EXTENSION_TO_LANGUAGE[extension] ?? "plaintext"
}

export { detectLanguageFromFileName }
