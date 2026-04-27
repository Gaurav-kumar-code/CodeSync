import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react"

export type NotificationType = "success" | "error" | "warning" | "info"

export interface NotificationMessage {
  id: string
  type: NotificationType
  title: string
  description?: string
  createdAt: number
}

interface NotificationContextValue {
  notifications: NotificationMessage[]
  notify: (payload: Omit<NotificationMessage, "id" | "createdAt">) => string
  dismiss: (id: string) => void
  clear: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([])

  const dismiss = useCallback((id: string) => {
    setNotifications((previous) => previous.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback((payload: Omit<NotificationMessage, "id" | "createdAt">) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const message: NotificationMessage = {
      id,
      createdAt: Date.now(),
      ...payload,
    }

    setNotifications((previous) => [message, ...previous])

    window.setTimeout(() => {
      dismiss(id)
    }, 5000)

    return id
  }, [dismiss])

  const clear = useCallback(() => {
    setNotifications([])
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      notify,
      dismiss,
      clear,
    }),
    [notifications, notify, dismiss, clear]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

const useNotificationContext = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotificationContext must be used inside NotificationProvider")
  }

  return context
}

export { NotificationProvider, useNotificationContext }
