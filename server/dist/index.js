"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const socket_io_1 = require("socket.io");
const nanoid_1 = require("nanoid");
const stream_1 = require("stream");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const CLIENT_DEV_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
];
const io = new socket_io_1.Server(server, {
    cors: {
        origin: (origin, cb) => cb(null, true),
        credentials: true,
    },
});
app.use((0, cors_1.default)({ origin: (origin, cb) => cb(null, true), credentials: true }));
app.use(express_1.default.json());
const UPLOAD_DIR = path_1.default.join(process.cwd(), 'uploads');
if (!fs_1.default.existsSync(UPLOAD_DIR))
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const id = (0, nanoid_1.nanoid)(10);
        const ext = path_1.default.extname(file.originalname) || '';
        cb(null, `${Date.now()}_${id}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage });
const rooms = new Map();
function getEffectivePositionSeconds(playback) {
    if (!playback.isPlaying)
        return playback.positionSeconds;
    const now = Date.now();
    const delta = (now - playback.lastSyncTsMs) / 1000;
    return Math.max(0, playback.positionSeconds + delta * playback.playbackRate);
}
function serializeRoom(room) {
    return {
        id: room.id,
        allowGuestControl: room.allowGuestControl,
        media: room.media || null,
        playback: {
            ...room.playback,
            positionSeconds: getEffectivePositionSeconds(room.playback),
        },
        users: Array.from(room.users.values()).map(u => ({ id: u.id, name: u.name, isMuted: u.isMuted, isAdmin: u.isAdmin })),
        chat: room.chat,
    };
}
function requireAdmin(room, secret) {
    return !!secret && secret === room.adminSecret;
}
// Health
app.get('/healthz', (_req, res) => res.json({ ok: true }));
// Upload local media
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    const filePath = req.file.filename;
    return res.json({ filename: filePath, url: `/media/${filePath}`, original: req.file.originalname, size: req.file.size });
});
// Serve uploaded media with Range support
app.get('/media/:filename', async (req, res) => {
    const filePath = path_1.default.join(UPLOAD_DIR, req.params.filename);
    if (!fs_1.default.existsSync(filePath))
        return res.sendStatus(404);
    const stat = fs_1.default.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (!range) {
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
        });
        fs_1.default.createReadStream(filePath).pipe(res);
        return;
    }
    const bytesPrefix = 'bytes=';
    if (!range.startsWith(bytesPrefix))
        return res.status(416).end();
    const [rangeStart, rangeEnd] = range.substring(bytesPrefix.length).split('-');
    const start = parseInt(rangeStart, 10);
    const end = rangeEnd ? parseInt(rangeEnd, 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1);
    if (isNaN(start) || isNaN(end) || start > end)
        return res.status(416).end();
    res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
    });
    fs_1.default.createReadStream(filePath, { start, end }).pipe(res);
});
// Simple Google Drive proxy for publicly shared files
// Usage: /drive/proxy?id=<fileId> or /drive/proxy?url=<uc_export_download_url>
app.get('/drive/proxy', async (req, res) => {
    try {
        const { id, url } = req.query;
        let targetUrl = url;
        if (!targetUrl && id) {
            targetUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
        }
        if (!targetUrl)
            return res.status(400).json({ error: 'Provide id or url' });
        const headers = {};
        if (req.headers.range)
            headers['Range'] = String(req.headers.range);
        const upstream = await fetch(targetUrl, { headers });
        if (!upstream.ok && upstream.status !== 206) {
            return res.status(upstream.status).end();
        }
        // Forward important headers
        const h = upstream.headers;
        if (h.get('content-type'))
            res.setHeader('Content-Type', h.get('content-type'));
        if (h.get('content-range'))
            res.setHeader('Content-Range', h.get('content-range'));
        if (h.get('accept-ranges'))
            res.setHeader('Accept-Ranges', h.get('accept-ranges'));
        if (h.get('content-length'))
            res.setHeader('Content-Length', h.get('content-length'));
        res.status(h.get('content-range') ? 206 : 200);
        if (!upstream.body)
            return res.end();
        stream_1.Readable.fromWeb(upstream.body).pipe(res);
    }
    catch (err) {
        console.error('Drive proxy error', err);
        res.sendStatus(500);
    }
});
// Socket.IO realtime
io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentUserId = null;
    socket.on('createRoom', (_data, cb) => {
        const roomId = (0, nanoid_1.nanoid)(8);
        const adminSecret = (0, nanoid_1.nanoid)(16);
        const room = {
            id: roomId,
            adminSecret,
            allowGuestControl: false,
            media: undefined,
            playback: { isPlaying: false, positionSeconds: 0, playbackRate: 1, lastSyncTsMs: Date.now() },
            users: new Map(),
            chat: [],
        };
        rooms.set(roomId, room);
        cb({ roomId, adminSecret });
    });
    socket.on('joinRoom', (data, cb) => {
        const { roomId, name, adminSecret } = data;
        const room = rooms.get(roomId);
        if (!room)
            return cb({ ok: false, error: 'Room not found' });
        currentRoomId = roomId;
        currentUserId = socket.id;
        socket.join(roomId);
        const isAdmin = requireAdmin(room, adminSecret);
        const user = { id: socket.id, name: name || 'Guest', isMuted: false, isAdmin };
        room.users.set(socket.id, user);
        io.to(roomId).emit('presence', { users: Array.from(room.users.values()) });
        cb({ ok: true, state: serializeRoom(room), selfId: socket.id, isAdmin });
    });
    socket.on('leaveRoom', () => {
        if (!currentRoomId)
            return;
        socket.leave(currentRoomId);
        const room = rooms.get(currentRoomId);
        if (room && currentUserId) {
            room.users.delete(currentUserId);
            io.to(currentRoomId).emit('presence', { users: Array.from(room.users.values()) });
        }
        currentRoomId = null;
        currentUserId = null;
    });
    socket.on('changeMedia', (data, cb) => {
        const room = rooms.get(data.roomId);
        if (!room)
            return cb?.(false);
        const isAllowed = room.allowGuestControl || requireAdmin(room, data.adminSecret);
        if (!isAllowed)
            return cb?.(false);
        room.media = data.media;
        room.playback = { ...room.playback, positionSeconds: 0, isPlaying: false, lastSyncTsMs: Date.now(), playbackRate: 1 };
        io.to(room.id).emit('mediaChanged', { media: room.media, playback: room.playback });
        cb?.(true);
    });
    socket.on('control', (data) => {
        const room = rooms.get(data.roomId);
        if (!room)
            return;
        const isAllowed = room.allowGuestControl || requireAdmin(room, data.adminSecret);
        if (!isAllowed)
            return;
        if (data.action === 'play') {
            room.playback.isPlaying = true;
            room.playback.lastSyncTsMs = Date.now();
        }
        else if (data.action === 'pause') {
            room.playback.positionSeconds = getEffectivePositionSeconds(room.playback);
            room.playback.isPlaying = false;
            room.playback.lastSyncTsMs = Date.now();
        }
        else if (data.action === 'seek' && typeof data.positionSeconds === 'number') {
            room.playback.positionSeconds = Math.max(0, data.positionSeconds);
            room.playback.lastSyncTsMs = Date.now();
        }
        else if (data.action === 'rate' && typeof data.playbackRate === 'number') {
            room.playback.playbackRate = Math.max(0.25, Math.min(3, data.playbackRate));
            room.playback.lastSyncTsMs = Date.now();
        }
        io.to(room.id).emit('sync', { playback: { ...room.playback, positionSeconds: getEffectivePositionSeconds(room.playback) } });
    });
    socket.on('toggleGuestControl', (data, cb) => {
        const room = rooms.get(data.roomId);
        if (!room)
            return cb?.(false);
        if (!requireAdmin(room, data.adminSecret))
            return cb?.(false);
        room.allowGuestControl = !room.allowGuestControl;
        io.to(room.id).emit('settings', { allowGuestControl: room.allowGuestControl });
        cb?.(true, room.allowGuestControl);
    });
    socket.on('chat:message', (data) => {
        if (!currentRoomId || currentRoomId !== data.roomId)
            return;
        const room = rooms.get(currentRoomId);
        if (!room || !currentUserId)
            return;
        const user = room.users.get(currentUserId);
        if (!user || user.isMuted)
            return;
        const msg = { id: (0, nanoid_1.nanoid)(12), userId: user.id, userName: user.name, text: String(data.text || '').slice(0, 2000), ts: Date.now() };
        room.chat.push(msg);
        io.to(room.id).emit('chat:new', msg);
    });
    socket.on('chat:typing', (data) => {
        if (!currentRoomId || currentRoomId !== data.roomId)
            return;
        socket.to(currentRoomId).emit('chat:typing', { userId: socket.id, typing: !!data.typing });
    });
    socket.on('presence:updateName', (data) => {
        const room = rooms.get(data.roomId);
        if (!room || !currentUserId)
            return;
        const user = room.users.get(currentUserId);
        if (!user)
            return;
        user.name = String(data.name || 'Guest').slice(0, 40);
        io.to(room.id).emit('presence', { users: Array.from(room.users.values()) });
    });
    socket.on('admin:mute', (data) => {
        const room = rooms.get(data.roomId);
        if (!room)
            return;
        if (!requireAdmin(room, data.adminSecret))
            return;
        const target = room.users.get(data.targetUserId);
        if (target) {
            target.isMuted = true;
            io.to(room.id).emit('presence', { users: Array.from(room.users.values()) });
        }
    });
    socket.on('admin:kick', (data) => {
        const room = rooms.get(data.roomId);
        if (!room)
            return;
        if (!requireAdmin(room, data.adminSecret))
            return;
        room.users.delete(data.targetUserId);
        io.to(data.targetUserId).socketsLeave(room.id);
        io.to(room.id).emit('presence', { users: Array.from(room.users.values()) });
    });
    socket.on('disconnect', () => {
        if (currentRoomId && currentUserId) {
            const room = rooms.get(currentRoomId);
            if (room) {
                room.users.delete(currentUserId);
                io.to(currentRoomId).emit('presence', { users: Array.from(room.users.values()) });
            }
        }
    });
});
const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map