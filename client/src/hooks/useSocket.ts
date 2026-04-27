import { useEffect, useMemo, useState } from "react"
import { socketService } from "../services/socketService"

export const useSocket = (token?: string) => {
  const [isConnected, setIsConnected] = useState(false)

  const socket = useMemo(() => socketService.connect(token), [token])

  useEffect(() => {
    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)

    setIsConnected(socket.connected)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
    }
  }, [socket])

  return {
    socket,
    isConnected,
    emit: socketService.emit.bind(socketService),
    on: socketService.on.bind(socketService),
    off: socketService.off.bind(socketService),
  }
}
