<div align="center">

# Code Sync

### Real-time Collaborative Coding Workspace with AI + Live Execution

Build, collaborate, run, and preview code together in one modern web workspace.

[![Stars](https://img.shields.io/github/stars/your-username/code-sync?style=for-the-badge&logo=github)](https://github.com/your-username/code-sync/stargazers)
[![Forks](https://img.shields.io/github/forks/your-username/code-sync?style=for-the-badge&logo=github)](https://github.com/your-username/code-sync/network/members)
[![Issues](https://img.shields.io/github/issues/your-username/code-sync?style=for-the-badge&logo=github)](https://github.com/your-username/code-sync/issues)
[![License](https://img.shields.io/badge/license-ISC-blue?style=for-the-badge)](#-license)
[![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-1f6feb?style=for-the-badge&logo=react)](#-tech-stack)
[![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-0d1117?style=for-the-badge&logo=nodedotjs)](#-tech-stack)
[![Realtime](https://img.shields.io/badge/realtime-Socket.io-f97316?style=for-the-badge&logo=socketdotio)](#-feature-highlights)

</div>

---

## Live Demo

- Live App: https://your-live-demo-url.com
- Demo Video: https://your-demo-video-url.com

> Replace these links with your deployed URLs.

### Preview Snapshot

![Code Sync Screenshot Placeholder](./assets/screenshot-placeholder.png)

---

## Why Code Sync?

Code Sync is designed for collaborative problem-solving and fast prototyping.
It combines a multi-file editor, live collaboration, AI assistance, execution, and preview into one smooth experience.

---

## Feature Highlights

### Collaboration
- 🤝 Real-time multi-user editing with synchronized workspace state
- 🧑‍🤝‍🧑 Room-based sessions for team coding
- 💬 Built-in chat for discussion while coding
- 🎨 Shared drawing board for architecture and logic explanation

### AI & Productivity
- 🧠 AI Copilot powered by Gemini
- ✍️ Contextual coding assistance and idea generation
- ⚡ Faster debugging and iteration workflows

### Execution & Preview
- ▶️ Multi-language code execution engine
- 🧪 Test-case ready workflow foundation
- 🌐 Live preview for HTML and React
- 🔗 Shareable browser preview link with live updates

### Workspace Experience
- 📁 Multi-file project structure
- 📦 Project upload via zip
- 🎯 Syntax highlighting and language-aware editing
- 🧩 Split editor layout for focused productivity

---

## Architecture Flow

```text
User Action
   |
   v
React Client (Editor + Collaboration UI)
   |
   +--> Socket.io Channel <------> Other Collaborators
   |
   +--> REST API (Express)
           |
           +--> Code Execution Service
           |
           +--> React/HTML Preview Bundler
           |
           +--> AI Copilot Service (Gemini)
```

### Request Lifecycle (Example)
1. User writes code in editor.
2. Code changes sync to collaborators through Socket.io.
3. User runs code or requests preview.
4. Backend processes execution/bundling.
5. Output/preview is returned and rendered instantly.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| 🎨 Frontend | React, TypeScript, Vite, Tailwind CSS |
| 🛠️ Backend | Node.js, Express, TypeScript |
| 🔌 Realtime | Socket.io |
| 🤖 AI | Gemini (`@google/genai`) |
| ⚙️ Tooling | ESLint, Prettier, ts-node, nodemon |

---

## Project Structure

```text
codeSync/
├── client/   # React + TypeScript frontend
└── server/   # Express + Socket.io backend
```

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-username/code-sync.git
cd code-sync
```

### 2. Install Dependencies

```bash
cd client
npm install

cd ../server
npm install
```

### 3. Configure Environment Variables

Create `.env` in the `server` directory.

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
PREVIEW_ASSET_BASE_URL=http://localhost:3000
```

If your frontend runs on another URL, add or update CORS logic as needed.

### 4. Start Development Servers

Open two terminals:

```bash
# Terminal 1
cd server
npm run dev
```

```bash
# Terminal 2
cd client
npm run dev
```

---

## Usage Guide

### Create or Join a Room
1. Open the app in browser.
2. Enter room ID and username.
3. Join shared workspace instantly.

### Collaborate in Real Time
1. Open files in the editor.
2. Type and edit with teammates.
3. Use chat and drawing board for coordination.

### Run Code
1. Select language/file.
2. Provide input if needed.
3. Click Run and review output panel.

### Use AI Copilot
1. Open Copilot panel.
2. Ask coding questions or request improvements.
3. Apply suggestions directly in workflow.

### Use Live Preview
1. Open an HTML/React file.
2. Switch to Preview tab.
3. Use Open Browser for full-size live preview link.

---

## Screenshots

| View | Preview |
|---|---|
| Editor Workspace | ![Editor Placeholder](./assets/editor-placeholder.png) |
| Live Preview | ![Preview Placeholder](./assets/preview-placeholder.png) |
| Collaboration + Chat | ![Collab Placeholder](./assets/collab-placeholder.png) |

> Replace placeholders with real screenshots from your app UI.

---

## Roadmap

- ✅ Real-time collaboration core
- ✅ AI Copilot integration
- ✅ Live preview with browser link
- 🔄 Advanced role-based collaboration (owner/editor/viewer)
- 🔄 Expanded test-case and submission workflow
- 🔄 Better React preview bundler diagnostics and reliability
- 🔄 Persistent project storage and version snapshots

---

## Contributing

Contributions are welcome and appreciated.

1. Fork the repository.
2. Create a feature branch.
3. Commit focused changes.
4. Open a pull request with clear description.

```bash
git checkout -b feature/awesome-improvement
git commit -m "feat: add awesome improvement"
git push origin feature/awesome-improvement
```

---

## License

This project is licensed under the ISC License.

---

## Recruiter Notes

- Demonstrates full-stack ownership with real-time systems.
- Includes collaborative UX, AI augmentation, and execution pipeline.
- Shows practical architecture combining Socket.io, Express, and modern React tooling.

---

<div align="center">

### Built for collaborative coding, interview prep, team learning, and rapid prototyping.

If you like this project, consider giving it a ⭐

</div>
