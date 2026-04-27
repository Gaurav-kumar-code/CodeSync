import { ReactNode } from "react"
import { AppContextProvider } from "./AppContext.js"
import { ChatContextProvider } from "./ChatContext.jsx"
import { FileContextProvider } from "./FileContext.jsx"
import { RunCodeContextProvider } from "./RunCodeContext.jsx"
import { SettingContextProvider } from "./SettingContext.jsx"
import { SocketProvider } from "./SocketContext.jsx"
import { ViewContextProvider } from "./ViewContext.js"
import { CopilotContextProvider } from "./CopilotContext.js"
import { ThemeProvider } from "./ThemeContext"
import { AuthProvider } from "./AuthContext"
import { ProjectProvider } from "./ProjectContext"
import { EditorProvider } from "./EditorContext"
import { NotificationProvider } from "./NotificationContext"

function AppProvider({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <ProjectProvider>
                    <EditorProvider>
                        <NotificationProvider>
                            <AppContextProvider>
                                <SocketProvider>
                                    <SettingContextProvider>
                                        <ViewContextProvider>
                                            <FileContextProvider>
                                                <CopilotContextProvider>
                                                    <RunCodeContextProvider>
                                                        <ChatContextProvider>
                                                            {children}
                                                        </ChatContextProvider>
                                                    </RunCodeContextProvider>
                                                </CopilotContextProvider>
                                            </FileContextProvider>
                                        </ViewContextProvider>
                                    </SettingContextProvider>
                                </SocketProvider>
                            </AppContextProvider>
                        </NotificationProvider>
                    </EditorProvider>
                </ProjectProvider>
            </AuthProvider>
        </ThemeProvider>
    )
}

export default AppProvider
