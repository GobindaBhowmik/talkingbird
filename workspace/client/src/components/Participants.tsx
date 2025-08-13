import { useRoomStore } from '../store/roomStore';
import { Button } from './ui/Button';

export function Participants({ adminSecret }: { adminSecret?: string }) {
  const { room, adminKick, adminMute, isAdmin } = useRoomStore();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <div className="px-4 py-3 border-b border-white/10 text-sm text-white/70">Participants</div>
      <div className="p-3 space-y-2">
        {room?.users.map((u) => (
          <div key={u.id} className="flex items-center gap-2">
            <div className="flex-1 text-sm">
              <div className="font-medium text-white">{u.name}</div>
              <div className="text-xs text-white/50">{u.isAdmin ? 'Admin' : u.isMuted ? 'Muted' : 'Member'}</div>
            </div>
            {isAdmin && !u.isAdmin ? (
              <div className="flex gap-2">
                <Button variant="subtle" size="sm" onClick={() => adminMute(u.id, adminSecret)}>Mute</Button>
                <Button variant="outline" size="sm" onClick={() => adminKick(u.id, adminSecret)}>Kick</Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}