# TogetherWatch

Synchronized watch parties with modern chat. Create a room, paste a YouTube/Google Drive/direct URL, or upload a local file and watch together in perfect sync. Fully responsive, mobile-first UI with admin controls.

## Features
- **Create/Join Rooms**: Share the room link with friends
- **Multiple Media Sources**:
  - **YouTube** links
  - **Google Drive** public files via built-in proxy
  - **Direct URLs** (e.g., MP4)
  - **Local uploads** (server streams with HTTP Range)
- **Realtime Sync**: Play, pause, seek, and playback-rate synced for everyone
- **Modern Chat**: Typing indicator, timestamps, slick UI
- **Admin Controls**: Toggle guest controls, mute/kick users, full playback control
- **Responsive UI**: Beautiful Tailwind styling, optimized for mobile

## Tech Stack
- **Client**: React + TypeScript + Vite, TailwindCSS, Zustand, Socket.IO client, React Player
- **Server**: Node.js + Express + TypeScript, Socket.IO, Multer (uploads)

## Repository Structure
```
/ (project root)
├─ server/                  # Node + Express + Socket.IO (TypeScript)
│  ├─ src/index.ts          # Server entry
│  ├─ uploads/              # Uploaded files (gitignored)
│  └─ tsconfig.json
└─ workspace/
   └─ client/               # Vite React client (TypeScript)
      ├─ src/
      ├─ index.html
      └─ tailwind.config.js
```

Note: The client lives in `workspace/client` due to the dev environment layout.

## Prerequisites
- Node.js 18+ and npm

## Quick Start (Development)
1) Start the server
```
cd server
npm install
npm run dev
```
The server runs on `http://localhost:4000` by default.

2) Start the client
```
cd workspace/client
npm install
# Optional: set the server URL for the client (default: http://localhost:4000)
echo "VITE_SERVER_URL=http://localhost:4000" > .env
npm run dev
```
Open the client at `http://localhost:5173`.

## Production Build
- Server
```
cd server
npm run build
npm start
```
- Client
```
cd workspace/client
npm run build
npm run preview
```

## Environment Variables
- Client (`workspace/client/.env`)
  - `VITE_SERVER_URL` (default `http://localhost:4000`): Base URL for the API/socket server

- Server
  - `PORT` (default `4000`)

## How To Use
- From the home page, click “Create room” to get a room URL. The URL includes an `admin` secret query param—keep it safe to retain admin privileges.
- Share the room URL (without the `admin` param) or the room ID with friends.
- Set media in the room:
  - Paste a **YouTube** or **direct video URL** and click Set
  - Paste a **Google Drive** share link; the server proxies it for playback (public files only)
  - Or **upload** a local video file. The server hosts it at `/media/:filename` with Range support
- Control playback: play, pause, seek, change playback rate. All viewers stay in sync.
- Use the chat sidebar to talk while watching. Admin can toggle guest control, mute, or kick participants.

## API Overview (Server)
- `GET /healthz` → `{ ok: true }`
- `POST /upload` (multipart/form-data `file`) → `{ filename, url, original, size }`
- `GET /media/:filename` → Streams uploaded media with HTTP Range
- `GET /drive/proxy?id=<fileId>` or `?url=<uc_export_url>` → Proxies Google Drive public files (supports Range)

### Socket.IO Events
Client → Server:
- `createRoom` → `{ roomId, adminSecret }`
- `joinRoom` `{ roomId, name, adminSecret? }` → `{ ok, state, selfId, isAdmin }`
- `leaveRoom`
- `changeMedia` `{ roomId, media, adminSecret? }` → `ok`
- `control` `{ roomId, action: 'play'|'pause'|'seek'|'rate', positionSeconds?, playbackRate?, adminSecret? }`
- `toggleGuestControl` `{ roomId, adminSecret? }` → `ok`
- `chat:message` `{ roomId, text }`
- `chat:typing` `{ roomId, typing }`
- `presence:updateName` `{ roomId, name }`
- `admin:mute` `{ roomId, targetUserId, adminSecret? }`
- `admin:kick` `{ roomId, targetUserId, adminSecret? }`

Server → Client:
- `presence` `{ users }`
- `mediaChanged` `{ media, playback }`
- `sync` `{ playback }`
- `settings` `{ allowGuestControl }`
- `chat:new` `message`
- `chat:typing` `{ userId, typing }`

## Notes & Limitations
- **Google Drive**: Files must be publicly accessible via share link; large files or restricted links may fail.
- **Uploads**: Files are stored in `server/uploads/`. Ensure your deployment disk and retention policies are appropriate.
- **CORS**: The server currently allows all origins for development convenience—tighten in production if needed.

## Troubleshooting
- Tailwind/PostCSS errors: ensure `@tailwindcss/postcss` is installed and `postcss.config.js` uses it.
- Player issues with Drive URLs: confirm the file is shared publicly or use the File ID.
- Sync feels off: network jitter can cause small drifts; the server resyncs on control events.

## Roadmap Ideas
- Authentication and persistent user profiles
- Persistent room history and chat logs (database)
- Multiple admin roles, handoff, and per-room settings
- HLS transcoding for broad codec support
- Emoji/stickers in chat and reactions on the timeline

Enjoy hosting watch parties! 🎬🍿