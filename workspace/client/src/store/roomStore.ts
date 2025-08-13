import { create } from 'zustand';
import { getSocket } from '../lib/socket';

export type MediaSource = {
  type: 'youtube' | 'url' | 'gdrive' | 'upload';
  url: string;
  title?: string;
};

export type PlaybackState = {
  isPlaying: boolean;
  positionSeconds: number;
  playbackRate: number;
  lastSyncTsMs: number;
};

export type RoomUser = {
  id: string;
  name: string;
  isMuted: boolean;
  isAdmin: boolean;
};

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  ts: number;
};

export type RoomState = {
  id: string;
  allowGuestControl: boolean;
  media?: MediaSource;
  playback: PlaybackState;
  users: RoomUser[];
  chat: ChatMessage[];
};

export type ClientState = {
  connected: boolean;
  selfId?: string;
  isAdmin?: boolean;
  room?: RoomState;

  joinRoom: (roomId: string, name: string, adminSecret?: string) => Promise<boolean>;
  createRoom: () => Promise<{ roomId: string; adminSecret: string } | null>;
  leaveRoom: () => void;

  setMedia: (media: MediaSource, adminSecret?: string) => Promise<boolean>;
  control: (action: 'play'|'pause'|'seek'|'rate', payload?: { positionSeconds?: number; playbackRate?: number }, adminSecret?: string) => void;
  sendMessage: (text: string) => void;
  toggleGuestControl: (adminSecret?: string) => Promise<boolean>;
  adminMute: (targetUserId: string, adminSecret?: string) => void;
  adminKick: (targetUserId: string, adminSecret?: string) => void;
};

export const useRoomStore = create<ClientState>((set, get) => {
  const socket = getSocket();

  socket.on('connect', () => set({ connected: true }));
  socket.on('disconnect', () => set({ connected: false }));

  socket.on('presence', (payload: { users: RoomUser[] }) => {
    const room = get().room;
    if (!room) return;
    set({ room: { ...room, users: payload.users } });
  });

  socket.on('mediaChanged', (payload: { media?: MediaSource; playback: PlaybackState }) => {
    const room = get().room;
    if (!room) return;
    set({ room: { ...room, media: payload.media, playback: payload.playback } });
  });

  socket.on('sync', (payload: { playback: PlaybackState }) => {
    const room = get().room;
    if (!room) return;
    set({ room: { ...room, playback: payload.playback } });
  });

  socket.on('settings', (payload: { allowGuestControl: boolean }) => {
    const room = get().room;
    if (!room) return;
    set({ room: { ...room, allowGuestControl: payload.allowGuestControl } });
  });

  socket.on('chat:new', (msg: ChatMessage) => {
    const room = get().room;
    if (!room) return;
    set({ room: { ...room, chat: [...room.chat, msg] } });
  });

  return {
    connected: socket.connected,

    async createRoom() {
      return new Promise((resolve) => {
        socket.emit('createRoom', {}, (payload: { roomId: string; adminSecret: string }) => resolve(payload));
      });
    },

    async joinRoom(roomId: string, name: string, adminSecret?: string) {
      return new Promise((resolve) => {
        socket.emit('joinRoom', { roomId, name, adminSecret }, (payload: any) => {
          if (!payload?.ok) return resolve(false);
          set({ selfId: payload.selfId, isAdmin: payload.isAdmin, room: payload.state });
          resolve(true);
        });
      });
    },

    leaveRoom() {
      socket.emit('leaveRoom');
      set({ room: undefined, selfId: undefined, isAdmin: false });
    },

    async setMedia(media: MediaSource, adminSecret?: string) {
      return new Promise((resolve) => {
        const roomId = get().room?.id;
        if (!roomId) return resolve(false);
        socket.emit('changeMedia', { roomId, media, adminSecret }, (ok: boolean) => resolve(ok));
      });
    },

    control(action, payload, adminSecret) {
      const roomId = get().room?.id;
      if (!roomId) return;
      socket.emit('control', { roomId, action, ...payload, adminSecret });
    },

    sendMessage(text: string) {
      const roomId = get().room?.id;
      if (!roomId) return;
      socket.emit('chat:message', { roomId, text });
    },

    async toggleGuestControl(adminSecret?: string) {
      return new Promise((resolve) => {
        const roomId = get().room?.id;
        if (!roomId) return resolve(false);
        socket.emit('toggleGuestControl', { roomId, adminSecret }, (ok: boolean) => resolve(ok));
      });
    },

    adminMute(targetUserId: string, adminSecret?: string) {
      const roomId = get().room?.id;
      if (!roomId) return;
      socket.emit('admin:mute', { roomId, targetUserId, adminSecret });
    },

    adminKick(targetUserId: string, adminSecret?: string) {
      const roomId = get().room?.id;
      if (!roomId) return;
      socket.emit('admin:kick', { roomId, targetUserId, adminSecret });
    },
  };
});