import { Route, BrowserRouter as Router, Routes } from "react-router-dom"
import GitHubCorner from "./components/GitHubCorner"
import Toast from "./components/toast/Toast"
import { NotificationToast } from "./components/toast/NotificationToast"
import DashboardPage from "./pages/DashboardPage"
import EditorPage from "./pages/EditorPage"
import AuthPage from "./pages/AuthPage"
import GitHubCallbackPage from "./pages/GitHubCallbackPage"
import HomePage from "./pages/HomePage"

const App = () => {
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/auth/github/callback" element={<GitHubCallbackPage />} />
                    <Route path="/editor/:roomId" element={<EditorPage />} />
                </Routes>
            </Router>
            <Toast /> {/* Toast component from react-hot-toast */}
            <NotificationToast />
            <GitHubCorner />
        </>
    )
}

export default App
