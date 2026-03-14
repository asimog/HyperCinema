"use client";

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  return (
    <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-black shadow-[0_22px_60px_rgba(0,0,0,0.35)]">
      <video
        src={src}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full"
      />
    </div>
  );
}
