import { useEffect, useMemo, useRef, useState } from 'react';
import { useRoomStore } from '../store/roomStore';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Paperclip, Send, Smile } from 'lucide-react';

export function Chat({ className }: { className?: string }) {
  const { room, sendMessage } = useRoomStore();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat.length]);

  const canSend = text.trim().length > 0;

  return (
    <div className={className}>
      <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5">
        <div className="px-4 py-3 border-b border-white/10 text-sm text-white/70">Chat</div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {room?.chat.map((m) => (
            <div key={m.id} className="flex flex-col">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="font-medium text-white">{m.userName}</span>
                <span>{new Date(m.ts).toLocaleTimeString()}</span>
              </div>
              <div className="max-w-[85%] rounded-xl bg-white/10 px-3 py-2 text-sm text-white/90">{m.text}</div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form
          className="flex items-center gap-2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSend) return;
            sendMessage(text);
            setText('');
          }}
        >
          <button type="button" className="rounded-full p-2 text-white/60 hover:bg-white/10"><Paperclip size={18} /></button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message..."
            className="flex-1"
          />
          <button type="button" className="rounded-full p-2 text-white/60 hover:bg-white/10"><Smile size={18} /></button>
          <Button type="submit" variant="solid" size="md" disabled={!canSend}>
            <Send size={16} />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}