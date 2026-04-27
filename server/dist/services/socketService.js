"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = void 0;
const mongoose_1 = require("mongoose");
const socket_1 = require("../types/socket");
const user_1 = require("../types/user");
const models_1 = require("../models");
const logService_1 = require("./logService");
let userSocketMap = [];
const getUsersInRoom = (roomId) => {
    return userSocketMap.filter((user) => user.roomId === roomId);
};
const getRoomId = (socketId) => {
    return userSocketMap.find((user) => user.socketId === socketId)?.roomId ?? null;
};
const getUserBySocketId = (socketId) => {
    return userSocketMap.find((user) => user.socketId === socketId) ?? null;
};
const isObjectIdLike = (value) => /^[0-9a-fA-F]{24}$/.test(value);
const upsertSessionJoin = async (projectId, username, socketId) => {
    if (!isObjectIdLike(projectId)) {
        return;
    }
    let session = await models_1.SessionModel.findOne({
        project: projectId,
        status: "active",
    });
    if (!session) {
        session = await models_1.SessionModel.create({
            project: projectId,
            status: "active",
            participants: [],
            startedAt: new Date(),
        });
    }
    session.participants.push({
        user: new mongoose_1.Types.ObjectId(),
        socketId,
        joinedAt: new Date(),
        isActive: true,
    });
    await session.save();
    await logService_1.LogService.createLog({
        actionType: "REQUEST",
        projectId,
        details: {
            event: socket_1.SocketEvent.JOIN_REQUEST,
            username,
            socketId,
        },
    });
};
const upsertSessionLeave = async (projectId, socketId) => {
    if (!isObjectIdLike(projectId)) {
        return;
    }
    const session = await models_1.SessionModel.findOne({
        project: projectId,
        status: "active",
    });
    if (!session) {
        return;
    }
    const participant = session.participants.find((item) => item.socketId === socketId && item.isActive);
    if (participant) {
        participant.isActive = false;
        participant.leftAt = new Date();
    }
    const activeCount = session.participants.filter((item) => item.isActive).length;
    if (activeCount === 0) {
        session.status = "ended";
        session.endedAt = new Date();
        session.durationSeconds = Math.max(0, Math.floor((Number(session.endedAt) - Number(session.startedAt)) / 1000));
    }
    await session.save();
};
const registerSocketHandlers = (io) => {
    io.on("connection", (socket) => {
        socket.on(socket_1.SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
            const isUsernameExist = getUsersInRoom(roomId).some((user) => user.username === username);
            if (isUsernameExist) {
                io.to(socket.id).emit(socket_1.SocketEvent.USERNAME_EXISTS);
                return;
            }
            const user = {
                username,
                roomId,
                status: user_1.USER_CONNECTION_STATUS.ONLINE,
                cursorPosition: 0,
                typing: false,
                socketId: socket.id,
                currentFile: null,
            };
            userSocketMap.push(user);
            socket.join(roomId);
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.USER_JOINED, { user });
            const users = getUsersInRoom(roomId);
            io.to(socket.id).emit(socket_1.SocketEvent.JOIN_ACCEPTED, { user, users });
            void upsertSessionJoin(roomId, username, socket.id);
        });
        socket.on("disconnecting", () => {
            const user = getUserBySocketId(socket.id);
            if (!user) {
                return;
            }
            const roomId = user.roomId;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.USER_DISCONNECTED, { user });
            userSocketMap = userSocketMap.filter((mappedUser) => mappedUser.socketId !== socket.id);
            socket.leave(roomId);
            void upsertSessionLeave(roomId, socket.id);
        });
        socket.on(socket_1.SocketEvent.SYNC_FILE_STRUCTURE, ({ fileStructure, openFiles, activeFile, socketId }) => {
            io.to(socketId).emit(socket_1.SocketEvent.SYNC_FILE_STRUCTURE, {
                fileStructure,
                openFiles,
                activeFile,
            });
        });
        socket.on(socket_1.SocketEvent.DIRECTORY_CREATED, ({ parentDirId, newDirectory }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.DIRECTORY_CREATED, { parentDirId, newDirectory });
        });
        socket.on(socket_1.SocketEvent.DIRECTORY_UPDATED, ({ dirId, children }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.DIRECTORY_UPDATED, { dirId, children });
        });
        socket.on(socket_1.SocketEvent.DIRECTORY_RENAMED, ({ dirId, newName }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.DIRECTORY_RENAMED, { dirId, newName });
        });
        socket.on(socket_1.SocketEvent.DIRECTORY_DELETED, ({ dirId }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.DIRECTORY_DELETED, { dirId });
        });
        socket.on(socket_1.SocketEvent.FILE_CREATED, ({ parentDirId, newFile }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.FILE_CREATED, { parentDirId, newFile });
        });
        socket.on(socket_1.SocketEvent.FILE_UPDATED, ({ fileId, newContent }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.FILE_UPDATED, { fileId, newContent });
        });
        socket.on(socket_1.SocketEvent.FILE_RENAMED, ({ fileId, newName }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.FILE_RENAMED, { fileId, newName });
        });
        socket.on(socket_1.SocketEvent.FILE_DELETED, ({ fileId }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.FILE_DELETED, { fileId });
        });
        socket.on(socket_1.SocketEvent.USER_OFFLINE, ({ socketId }) => {
            userSocketMap = userSocketMap.map((user) => {
                if (user.socketId === socketId) {
                    return { ...user, status: user_1.USER_CONNECTION_STATUS.OFFLINE };
                }
                return user;
            });
            const roomId = getRoomId(socketId);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.USER_OFFLINE, { socketId });
        });
        socket.on(socket_1.SocketEvent.USER_ONLINE, ({ socketId }) => {
            userSocketMap = userSocketMap.map((user) => {
                if (user.socketId === socketId) {
                    return { ...user, status: user_1.USER_CONNECTION_STATUS.ONLINE };
                }
                return user;
            });
            const roomId = getRoomId(socketId);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.USER_ONLINE, { socketId });
        });
        socket.on(socket_1.SocketEvent.SEND_MESSAGE, async ({ message }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.RECEIVE_MESSAGE, { message });
            try {
                await models_1.MessageModel.create({
                    sender: new mongoose_1.Types.ObjectId(),
                    project: isObjectIdLike(roomId) ? new mongoose_1.Types.ObjectId(roomId) : undefined,
                    content: String(message?.content ?? ""),
                    markdown: true,
                });
            }
            catch (error) {
                console.error("Failed to persist socket message", error);
            }
        });
        socket.on(socket_1.SocketEvent.TYPING_START, ({ cursorPosition, selectionStart, selectionEnd }) => {
            userSocketMap = userSocketMap.map((user) => {
                if (user.socketId === socket.id) {
                    return {
                        ...user,
                        typing: true,
                        cursorPosition,
                        selectionStart,
                        selectionEnd,
                    };
                }
                return user;
            });
            const user = getUserBySocketId(socket.id);
            if (!user)
                return;
            socket.broadcast.to(user.roomId).emit(socket_1.SocketEvent.TYPING_START, { user });
        });
        socket.on(socket_1.SocketEvent.TYPING_PAUSE, () => {
            userSocketMap = userSocketMap.map((user) => {
                if (user.socketId === socket.id) {
                    return { ...user, typing: false };
                }
                return user;
            });
            const user = getUserBySocketId(socket.id);
            if (!user)
                return;
            socket.broadcast.to(user.roomId).emit(socket_1.SocketEvent.TYPING_PAUSE, { user });
        });
        socket.on(socket_1.SocketEvent.CURSOR_MOVE, ({ cursorPosition, selectionStart, selectionEnd }) => {
            userSocketMap = userSocketMap.map((user) => {
                if (user.socketId === socket.id) {
                    return {
                        ...user,
                        cursorPosition,
                        selectionStart,
                        selectionEnd,
                    };
                }
                return user;
            });
            const user = getUserBySocketId(socket.id);
            if (!user)
                return;
            socket.broadcast.to(user.roomId).emit(socket_1.SocketEvent.CURSOR_MOVE, { user });
        });
        socket.on(socket_1.SocketEvent.REQUEST_DRAWING, () => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.REQUEST_DRAWING, { socketId: socket.id });
        });
        socket.on(socket_1.SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
            socket.broadcast.to(socketId).emit(socket_1.SocketEvent.SYNC_DRAWING, { drawingData });
        });
        socket.on(socket_1.SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
            const roomId = getRoomId(socket.id);
            if (!roomId)
                return;
            socket.broadcast.to(roomId).emit(socket_1.SocketEvent.DRAWING_UPDATE, { snapshot });
        });
    });
};
exports.registerSocketHandlers = registerSocketHandlers;
