import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { MediaPlayer } from '../components/MediaPlayer';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Chat } from '../components/Chat';
import { Participants } from '../components/Participants';
import { Link } from 'react-router-dom';
import axios from 'axios';

export function RoomPage() {
  const { roomId } = useParams();
  const [params] = useSearchParams();
  const adminSecret = params.get('admin') || undefined;
  const { joinRoom, room, setMedia, control, toggleGuestControl } = useRoomStore();

  const [joined, setJoined] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!roomId || joined) return;
    const username = `Guest-${Math.floor(Math.random() * 1000)}`;
    joinRoom(roomId, username, adminSecret).then((ok) => setJoined(ok));
  }, [roomId, joined]);

  const isAdmin = useRoomStore((s) => s.isAdmin);

  async function handleSetUrl(url: string) {
    const m = normalizeMedia(url);
    if (!m) return;
    await setMedia(m, adminSecret);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
      const res = await axios.post(`${serverUrl}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const media = { type: 'upload' as const, url: `${serverUrl}${res.data.url}`, title: res.data.original };
      await setMedia(media, adminSecret);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container-responsive py-4">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="text-white/70 hover:text-white">← New room</Link>
          <div className="flex items-center gap-2">
            <Badge>{room?.id}</Badge>
            {isAdmin ? <Badge className="bg-emerald-600/30">Admin</Badge> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-3">
              <MediaPlayer
                source={room?.media ? { type: room.media.type, url: room.media.url } : undefined}
                state={{
                  isPlaying: !!room?.playback.isPlaying,
                  positionSeconds: room?.playback.positionSeconds || 0,
                  playbackRate: room?.playback.playbackRate || 1,
                }}
                onPlay={() => control('play', {}, adminSecret)}
                onPause={(c) => control('pause', { positionSeconds: c }, adminSecret)}
                onSeek={(s) => control('seek', { positionSeconds: s }, adminSecret)}
                onRate={(r) => control('rate', { playbackRate: r }, adminSecret)}
              />
            </Card>

            <Card className="p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="text-sm text-white/70 mb-1">Paste YouTube or direct video URL</div>
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={inputUrl} onChange={(e) => setInputUrl(e.target.value)} />
                    <Button onClick={() => handleSetUrl(inputUrl)} disabled={!isAdmin && !room?.allowGuestControl}>Set</Button>
                  </div>
                  <div className="text-xs text-white/50 mt-1">Supports YouTube links, direct MP4, or Google Drive share URLs</div>
                </div>
                <div>
                  <div className="text-sm text-white/70 mb-1">Or upload a local file</div>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10">
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUpload(f);
                      }}
                    />
                    {uploading ? 'Uploading...' : 'Choose file'}
                  </label>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => control('play', {}, adminSecret)} disabled={!isAdmin && !room?.allowGuestControl}>Play</Button>
                <Button variant="outline" onClick={() => control('pause', {}, adminSecret)} disabled={!isAdmin && !room?.allowGuestControl}>Pause</Button>
                <Button variant="subtle" onClick={() => control('seek', { positionSeconds: 0 }, adminSecret)} disabled={!isAdmin && !room?.allowGuestControl}>Restart</Button>
                {isAdmin ? (
                  <Button variant="ghost" onClick={() => toggleGuestControl(adminSecret)}>
                    {room?.allowGuestControl ? 'Disable guest control' : 'Enable guest control'}
                  </Button>
                ) : null}
                <div className="ml-auto flex items-center gap-2 text-sm text-white/70">
                  <span>Rate</span>
                  {[0.5, 1, 1.25, 1.5, 2].map((r) => (
                    <button key={r} onClick={() => control('rate', { playbackRate: r }, adminSecret)} className={`rounded-md px-2 py-1 ${room?.playback.playbackRate === r ? 'bg-brand-600 text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}>{r}x</button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <Chat />
            <Participants adminSecret={adminSecret} />
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeMedia(url: string) {
  const u = url.trim();
  if (!u) return null;
  if (u.includes('youtube.com') || u.includes('youtu.be')) return { type: 'youtube' as const, url: u };
  if (u.includes('drive.google.com')) return { type: 'gdrive' as const, url: u };
  return { type: 'url' as const, url: u };
}