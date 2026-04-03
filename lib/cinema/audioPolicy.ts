import type { JobRequestKind } from "@/lib/types/domain";

export interface CinemaAudioPromptContext {
  requestKind?: JobRequestKind;
  requestedPrompt?: string | null;
  subjectDescription?: string | null;
  sourceTranscript?: string | null;
  narrativeSummary?: string | null;
  audioEnabled?: boolean | null;
}

function compactText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function inferVoiceRequested(input: CinemaAudioPromptContext): boolean {
  if (input.requestKind === "bedtime_story") {
    return true;
  }

  const text = [
    compactText(input.requestedPrompt),
    compactText(input.subjectDescription),
    compactText(input.sourceTranscript),
    compactText(input.narrativeSummary),
  ].join(" ");

  return /\b(voice|voiceover|narrat|spoken|dialogue|speech|read aloud|talking)\b/.test(text);
}

export function buildAudioDirectionLine(input: CinemaAudioPromptContext): string {
  const voiceRequested = inferVoiceRequested(input);

  if (input.requestKind === "bedtime_story") {
    return voiceRequested
      ? "Audio rule: gentle narration is allowed, but keep the mix cinematic, intimate, and warm."
      : "Audio rule: cinematic lullaby score and soft sound design only; no narration unless explicitly requested.";
  }

  if (input.requestKind === "music_video") {
    return input.audioEnabled === false
      ? "Audio rule: mute speech and emphasize the visual edit."
      : "Audio rule: cinematic score, beat-locked music, and rich sound design only; no narration or voice unless explicitly requested.";
  }

  if (input.requestKind === "scene_recreation") {
    return input.audioEnabled === false
      ? "Audio rule: mute speech and let the reconstruction read visually."
      : voiceRequested
        ? "Audio rule: preserve dialogue cadence only because the brief explicitly asks for speech."
        : "Audio rule: cinematic ambience and source-faithful sound design only; no narration or voice unless explicitly requested.";
  }

  if (input.audioEnabled === false) {
    return "Audio rule: silent visual-first cut with no narration, no voice, and no music.";
  }

  return voiceRequested
    ? "Audio rule: voice is allowed only because the brief explicitly requests it. Keep it sparse and intentional."
    : "Audio rule: cinematic score and atmospheric sound design only. No narration, no voice, and no dialogue unless the user explicitly requests speech.";
}

export function buildSoundBibleLines(input: CinemaAudioPromptContext): string[] {
  const voiceRequested = inferVoiceRequested(input);

  return [
    voiceRequested
      ? "Speech may appear only where the brief explicitly requests it; otherwise, keep the mix speech-free."
      : "No narration or voice unless the brief explicitly requests speech.",
    "Keep one continuous musical identity: cinematic score, atmospheric textures, and emotionally matched dynamics.",
    "No random genre swaps, no clownish SFX pileups, no crowd noise, no clipping.",
  ];
}

