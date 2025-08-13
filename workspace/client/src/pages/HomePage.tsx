import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { Sparkles } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { createRoom } = useRoomStore();
  const [joinId, setJoinId] = useState('');

  return (
    <div className="min-h-screen">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-700/30 via-transparent to-transparent blur-3xl" />
      <div className="container-responsive py-16">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600/20 text-brand-300">
            <Sparkles size={28} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Watch anything together</h1>
          <p className="mt-4 text-lg text-white/70">Create a synced room to watch YouTube, Google Drive, or your local files with friends. Modern chat included.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              className="w-full sm:w-auto"
              onClick={async () => {
                const res = await createRoom();
                if (!res) return;
                const params = new URLSearchParams({ admin: res.adminSecret });
                navigate(`/r/${res.roomId}?${params.toString()}`);
              }}
            >Create room</Button>
            <div className="flex w-full max-w-sm items-center gap-2">
              <Input placeholder="Enter room id" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
              <Button
                variant="outline"
                onClick={() => {
                  if (joinId.trim()) navigate(`/r/${joinId.trim()}`);
                }}
              >Join</Button>
            </div>
          </div>
          <p className="mt-6 text-sm text-white/60">Admin controls everything: media, playback, permissions. Mobile-first, blazing-fast.</p>
        </div>
      </div>
    </div>
  );
}