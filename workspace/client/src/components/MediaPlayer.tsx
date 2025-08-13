import { useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
const RPAny: any = ReactPlayer as any;

export type PlayerKind = 'youtube' | 'url' | 'gdrive' | 'upload';

export type PlayerSource = {
  type: PlayerKind;
  url: string;
};

export type PlayerState = {
  isPlaying: boolean;
  positionSeconds: number;
  playbackRate: number;
};

export type PlayerEvents = {
  onPlay: () => void;
  onPause: (current: number) => void;
  onSeek: (seconds: number) => void;
  onRate: (rate: number) => void;
};



export function MediaPlayer({ source, state, onPlay, onPause, onSeek }: { source?: PlayerSource; state: PlayerState; } & PlayerEvents) {
  const ref = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;
    const current = ref.current.getCurrentTime?.() || 0;
    const delta = Math.abs(current - state.positionSeconds);
    if (delta > 0.6) {
      ref.current.seekTo(state.positionSeconds, 'seconds');
    }
  }, [state.positionSeconds]);

  useEffect(() => {
    if (!ref.current) return;
    try {
      ref.current.getInternalPlayer()?.setPlaybackRate?.(state.playbackRate);
    } catch {}
  }, [state.playbackRate]);

  if (!source) {
    return (
      <div className="aspect-video w-full rounded-xl bg-black/50 grid place-items-center text-white/60">
        Select a video to start watching together
      </div>
    );
  }

  let url = source.url;
  if (source.type === 'gdrive') {
    const isId = !source.url.includes('http');
    url = `${import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'}/drive/proxy?${isId ? `id=${encodeURIComponent(source.url)}` : `url=${encodeURIComponent(source.url)}`}`;
  }

  return (
    <div className="relative w-full">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        <RPAny
          ref={ref}
          url={url}
          width="100%"
          height="100%"
          playing={state.isPlaying}
          controls
          playbackRate={state.playbackRate}
          onPlay={() => onPlay()}
          onPause={() => onPause(ref.current?.getCurrentTime?.() || 0)}
          onSeek={(s: number) => onSeek(s)}
          config={{
            youtube: { playerVars: { modestbranding: 1, rel: 0 } },
            file: { forceHLS: false },
          } as any}
        />
      </div>
    </div>
  );
}