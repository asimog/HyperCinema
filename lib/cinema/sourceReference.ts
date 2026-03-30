import { JobRequestKind, SourceReferenceSummary } from "@/lib/types/domain";

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function splitTranscript(input?: string | null): string[] {
  if (!input?.trim()) {
    return [];
  }

  return input
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*\d+\s*[-–:]\s*/, "").trim())
    .filter(Boolean)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((line) => line.trim())
    .filter(Boolean);
}

function transcriptExcerpt(input?: string | null): string | null {
  const excerpt = splitTranscript(input).slice(0, 2).join(" ");
  return trimOrNull(excerpt);
}

function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtu.be")
    );
  } catch {
    return false;
  }
}

function normalizeProvider(rawProvider?: string | null, url?: string | null): string {
  const provider = trimOrNull(rawProvider)?.toLowerCase();
  if (provider) {
    return provider;
  }

  if (url && isYouTubeUrl(url)) {
    return "youtube";
  }

  return "web";
}

function detectReferenceMode(input: {
  requestKind?: JobRequestKind;
  subjectDescription?: string | null;
  title?: string | null;
}): SourceReferenceSummary["referenceMode"] {
  if (input.requestKind === "scene_recreation") {
    return "scene_reference";
  }

  if (input.requestKind === "music_video") {
    return "music_reference";
  }

  const haystack = [input.subjectDescription, input.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(song|lyrics|chorus|verse|music|nursery rhyme|lullaby|melody|track)\b/.test(
      haystack,
    )
  ) {
    return "music_reference";
  }

  return "reference_video";
}

async function fetchYouTubeOEmbed(url: string): Promise<{
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
}> {
  try {
    const endpoint =
      "https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url);
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        title: null,
        authorName: null,
        thumbnailUrl: null,
      };
    }

    const payload = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    return {
      title: trimOrNull(payload.title),
      authorName: trimOrNull(payload.author_name),
      thumbnailUrl: trimOrNull(payload.thumbnail_url),
    };
  } catch {
    return {
      title: null,
      authorName: null,
      thumbnailUrl: null,
    };
  }
}

export async function resolveSourceReferenceSummary(input: {
  requestKind?: JobRequestKind;
  sourceMediaUrl?: string | null;
  sourceEmbedUrl?: string | null;
  sourceMediaProvider?: string | null;
  sourceTranscript?: string | null;
  subjectDescription?: string | null;
}): Promise<SourceReferenceSummary | null> {
  const url = trimOrNull(input.sourceMediaUrl);
  const embedUrl = trimOrNull(input.sourceEmbedUrl);
  const transcript = transcriptExcerpt(input.sourceTranscript);

  if (!url && !embedUrl && !transcript) {
    return null;
  }

  const provider = normalizeProvider(input.sourceMediaProvider, url ?? embedUrl);
  const oembed =
    url && provider === "youtube"
      ? await fetchYouTubeOEmbed(url)
      : {
          title: null,
          authorName: null,
          thumbnailUrl: null,
        };

  return {
    provider,
    url,
    embedUrl,
    title: oembed.title,
    authorName: oembed.authorName,
    thumbnailUrl: oembed.thumbnailUrl,
    transcriptExcerpt: transcript,
    referenceMode: detectReferenceMode({
      requestKind: input.requestKind,
      subjectDescription: input.subjectDescription,
      title: oembed.title,
    }),
  };
}

export function sourceReferenceLabel(
  source: SourceReferenceSummary | null | undefined,
): string | null {
  if (!source) {
    return null;
  }

  const title = trimOrNull(source.title);
  const author = trimOrNull(source.authorName);
  const provider = source.provider.toUpperCase();

  if (title && author) {
    return `${provider}: ${title} by ${author}`;
  }

  if (title) {
    return `${provider}: ${title}`;
  }

  if (source.url) {
    return `${provider}: ${source.url}`;
  }

  return `${provider} source reference`;
}

export function buildSourceReferencePrompt(
  source: SourceReferenceSummary | null | undefined,
): string[] {
  if (!source) {
    return [];
  }

  const lines = [
    sourceReferenceLabel(source),
    source.transcriptExcerpt
      ? `Use this transcript only as a beat/mood guide: ${source.transcriptExcerpt}`
      : null,
    source.referenceMode === "music_reference"
      ? "Treat the source as a music or nursery-rhyme reference. Echo its rhythm, innocence, and iconography without turning the video into karaoke captions."
      : source.referenceMode === "scene_reference"
        ? "Treat the source as a scene reference. Preserve emotional logic, blocking intent, and shot rhythm while rebuilding the visuals."
        : "Treat the source as a visual and emotional reference. Pull image logic, subject matter, and tone from it instead of inventing an unrelated world.",
  ].filter((value): value is string => Boolean(value));

  return lines;
}

export function allowsOnScreenText(input: {
  requestedPrompt?: string | null;
  subjectDescription?: string | null;
}): boolean {
  const haystack = [input.requestedPrompt, input.subjectDescription]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(subtitle|subtitles|caption|captions|karaoke|lyrics on screen|text on screen|title card|intertitle|lower third)\b/.test(
    haystack,
  );
}

export function buildOnScreenTextPolicy(input: {
  source: SourceReferenceSummary | null | undefined;
  allowOnScreenText: boolean;
}): string {
  if (input.allowOnScreenText) {
    return "On-screen text is allowed only as a deliberate graphic choice. Never auto-generate karaoke captions, subtitles, or debug text.";
  }

  if (input.source?.transcriptExcerpt) {
    return "No subtitles, lyric captions, lower-thirds, UI overlays, or debug text. Use the transcript as invisible rhythm guidance only.";
  }

  return "No subtitles, lyric captions, burnt-in text, lower-thirds, UI overlays, or debug text. Let performance, blocking, camera language, and editing carry meaning.";
}
