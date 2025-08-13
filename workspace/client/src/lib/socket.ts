import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:4000', {
      transports: ['websocket'],
      withCredentials: true,
    });
  }
  return socket;
}