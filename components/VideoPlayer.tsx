"use client";

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  return (
    <div className="surface-card video-frame">
      <video
        src={src}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full rounded-[1.15rem]"
      />
    </div>
  );
}
