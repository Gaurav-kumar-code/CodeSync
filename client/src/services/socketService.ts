import { io, Socket } from "socket.io-client"

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3000"

type SocketEventHandler = (...args: any[]) => void

class SocketService {
  private socket: Socket | null = null

  connect(token?: string) {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(WS_URL, {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1000,
      timeout: 15000,
    })

    return this.socket
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  emit(event: string, payload?: unknown) {
    this.socket?.emit(event, payload)
  }

  on(event: string, handler: SocketEventHandler) {
    this.socket?.on(event, handler)
  }

  off(event: string, handler?: SocketEventHandler) {
    if (handler) {
      this.socket?.off(event, handler)
      return
    }

    this.socket?.removeAllListeners(event)
  }

  isConnected() {
    return Boolean(this.socket?.connected)
  }

  getSocket() {
    return this.socket
  }
}

const socketService = new SocketService()

export { socketService }
