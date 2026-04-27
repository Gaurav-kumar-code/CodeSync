import { Server } from "socket.io"
import { Types } from "mongoose"
import { SocketEvent, SocketId } from "../types/socket"
import { USER_CONNECTION_STATUS, User } from "../types/user"
import { MessageModel, SessionModel } from "../models"
import { LogService } from "./logService"

let userSocketMap: User[] = []

const getUsersInRoom = (roomId: string): User[] => {
  return userSocketMap.filter((user) => user.roomId === roomId)
}

const getRoomId = (socketId: SocketId): string | null => {
  return userSocketMap.find((user) => user.socketId === socketId)?.roomId ?? null
}

const getUserBySocketId = (socketId: SocketId): User | null => {
  return userSocketMap.find((user) => user.socketId === socketId) ?? null
}

const isObjectIdLike = (value: string) => /^[0-9a-fA-F]{24}$/.test(value)

const upsertSessionJoin = async (projectId: string, username: string, socketId: string) => {
  if (!isObjectIdLike(projectId)) {
    return
  }

  let session = await SessionModel.findOne({
    project: projectId,
    status: "active",
  })

  if (!session) {
    session = await SessionModel.create({
      project: projectId,
      status: "active",
      participants: [],
      startedAt: new Date(),
    })
  }

  session.participants.push({
    user: new Types.ObjectId(),
    socketId,
    joinedAt: new Date(),
    isActive: true,
  })

  await session.save()

  await LogService.createLog({
    actionType: "REQUEST",
    projectId,
    details: {
      event: SocketEvent.JOIN_REQUEST,
      username,
      socketId,
    },
  })
}

const upsertSessionLeave = async (projectId: string, socketId: string) => {
  if (!isObjectIdLike(projectId)) {
    return
  }

  const session = await SessionModel.findOne({
    project: projectId,
    status: "active",
  })

  if (!session) {
    return
  }

  const participant = session.participants.find((item) => item.socketId === socketId && item.isActive)
  if (participant) {
    participant.isActive = false
    participant.leftAt = new Date()
  }

  const activeCount = session.participants.filter((item) => item.isActive).length

  if (activeCount === 0) {
    session.status = "ended"
    session.endedAt = new Date()
    session.durationSeconds = Math.max(
      0,
      Math.floor((Number(session.endedAt) - Number(session.startedAt)) / 1000)
    )
  }

  await session.save()
}

const registerSocketHandlers = (io: Server) => {
  io.on("connection", (socket) => {
    socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
      const isUsernameExist = getUsersInRoom(roomId).some((user) => user.username === username)
      if (isUsernameExist) {
        io.to(socket.id).emit(SocketEvent.USERNAME_EXISTS)
        return
      }

      const user: User = {
        username,
        roomId,
        status: USER_CONNECTION_STATUS.ONLINE,
        cursorPosition: 0,
        typing: false,
        socketId: socket.id,
        currentFile: null,
      }

      userSocketMap.push(user)
      socket.join(roomId)
      socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user })

      const users = getUsersInRoom(roomId)
      io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users })

      void upsertSessionJoin(roomId, username, socket.id)
    })

    socket.on("disconnecting", () => {
      const user = getUserBySocketId(socket.id)
      if (!user) {
        return
      }

      const roomId = user.roomId
      socket.broadcast.to(roomId).emit(SocketEvent.USER_DISCONNECTED, { user })
      userSocketMap = userSocketMap.filter((mappedUser) => mappedUser.socketId !== socket.id)
      socket.leave(roomId)

      void upsertSessionLeave(roomId, socket.id)
    })

    socket.on(SocketEvent.SYNC_FILE_STRUCTURE, ({ fileStructure, openFiles, activeFile, socketId }) => {
      io.to(socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, {
        fileStructure,
        openFiles,
        activeFile,
      })
    })

    socket.on(SocketEvent.DIRECTORY_CREATED, ({ parentDirId, newDirectory }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_CREATED, { parentDirId, newDirectory })
    })

    socket.on(SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_UPDATED, { dirId, children })
    })

    socket.on(SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_RENAMED, { dirId, newName })
    })

    socket.on(SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.DIRECTORY_DELETED, { dirId })
    })

    socket.on(SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.FILE_CREATED, { parentDirId, newFile })
    })

    socket.on(SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.FILE_UPDATED, { fileId, newContent })
    })

    socket.on(SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.FILE_RENAMED, { fileId, newName })
    })

    socket.on(SocketEvent.FILE_DELETED, ({ fileId }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.FILE_DELETED, { fileId })
    })

    socket.on(SocketEvent.USER_OFFLINE, ({ socketId }) => {
      userSocketMap = userSocketMap.map((user) => {
        if (user.socketId === socketId) {
          return { ...user, status: USER_CONNECTION_STATUS.OFFLINE }
        }
        return user
      })

      const roomId = getRoomId(socketId)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.USER_OFFLINE, { socketId })
    })

    socket.on(SocketEvent.USER_ONLINE, ({ socketId }) => {
      userSocketMap = userSocketMap.map((user) => {
        if (user.socketId === socketId) {
          return { ...user, status: USER_CONNECTION_STATUS.ONLINE }
        }
        return user
      })

      const roomId = getRoomId(socketId)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.USER_ONLINE, { socketId })
    })

    socket.on(SocketEvent.SEND_MESSAGE, async ({ message }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return

      socket.broadcast.to(roomId).emit(SocketEvent.RECEIVE_MESSAGE, { message })

      try {
        await MessageModel.create({
          sender: new Types.ObjectId(),
          project: isObjectIdLike(roomId) ? new Types.ObjectId(roomId) : undefined,
          content: String(message?.content ?? ""),
          markdown: true,
        })
      } catch (error) {
        console.error("Failed to persist socket message", error)
      }
    })

    socket.on(SocketEvent.TYPING_START, ({ cursorPosition, selectionStart, selectionEnd }) => {
      userSocketMap = userSocketMap.map((user) => {
        if (user.socketId === socket.id) {
          return {
            ...user,
            typing: true,
            cursorPosition,
            selectionStart,
            selectionEnd,
          }
        }
        return user
      })

      const user = getUserBySocketId(socket.id)
      if (!user) return
      socket.broadcast.to(user.roomId).emit(SocketEvent.TYPING_START, { user })
    })

    socket.on(SocketEvent.TYPING_PAUSE, () => {
      userSocketMap = userSocketMap.map((user) => {
        if (user.socketId === socket.id) {
          return { ...user, typing: false }
        }
        return user
      })

      const user = getUserBySocketId(socket.id)
      if (!user) return
      socket.broadcast.to(user.roomId).emit(SocketEvent.TYPING_PAUSE, { user })
    })

    socket.on(SocketEvent.CURSOR_MOVE, ({ cursorPosition, selectionStart, selectionEnd }) => {
      userSocketMap = userSocketMap.map((user) => {
        if (user.socketId === socket.id) {
          return {
            ...user,
            cursorPosition,
            selectionStart,
            selectionEnd,
          }
        }

        return user
      })

      const user = getUserBySocketId(socket.id)
      if (!user) return
      socket.broadcast.to(user.roomId).emit(SocketEvent.CURSOR_MOVE, { user })
    })

    socket.on(SocketEvent.REQUEST_DRAWING, () => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id })
    })

    socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
      socket.broadcast.to(socketId).emit(SocketEvent.SYNC_DRAWING, { drawingData })
    })

    socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
      const roomId = getRoomId(socket.id)
      if (!roomId) return
      socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, { snapshot })
    })
  })
}

export { registerSocketHandlers }
