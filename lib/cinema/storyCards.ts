import { JobRequestKind, StoryCard } from "@/lib/types/domain";

function trimSentence(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return "";
  }
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
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

function takeTranscriptBeat(lines: string[], index: number, fallback: string): string {
  return trimSentence(lines[index] ?? fallback);
}

function modeTone(requestKind: JobRequestKind | undefined): string {
  switch (requestKind) {
    case "bedtime_story":
      return "gentle and reassuring";
    case "music_video":
      return "rhythmic, dramatic, and performance-first";
    case "scene_recreation":
      return "tense, referential, and trailer-sharp";
    case "token_video":
      return "memetic and high-energy";
    default:
      return "cinematic and replayable";
  }
}

function continuationAngle(requestKind: JobRequestKind | undefined): string {
  switch (requestKind) {
    case "music_video":
      return "Open a second verse or bridge with a more aggressive visual escalation.";
    case "scene_recreation":
      return "Push into the next scene while preserving the same dialogue cadence and emotional stakes.";
    case "bedtime_story":
      return "Carry the story forward into a softer, sleepier resolution without adding fear.";
    case "token_video":
      return "Reveal a bigger, louder final card that still respects the token identity anchor.";
    default:
      return "Design a sequel beat that raises the stakes without breaking continuity.";
  }
}

export function buildContinuationPrompt(input: {
  requestKind?: JobRequestKind;
  subjectName?: string | null;
  subjectDescription?: string | null;
  requestedPrompt?: string | null;
  sourceTranscript?: string | null;
  sourceReferenceLabel?: string | null;
  storyBeats?: string[] | null;
}): string {
  const subject = input.subjectName?.trim() || "this trailer";
  const description = trimSentence(
    input.subjectDescription?.trim() || "Keep the visual identity stable and the pacing sharper.",
  );
  const direction = trimSentence(
    input.requestedPrompt?.trim() || continuationAngle(input.requestKind),
  );
  const transcriptHint = splitTranscript(input.sourceTranscript).slice(0, 2).join(" ");
  const beatHint = input.storyBeats?.filter(Boolean).slice(0, 2).join(" ");

  return [
    `Continue ${subject} as the next trailer beat.`,
    description,
    direction,
    input.sourceReferenceLabel
      ? `Keep the source reference visible in the world logic: ${input.sourceReferenceLabel}.`
      : "",
    transcriptHint ? `Keep the dialogue spine anchored to: ${transcriptHint}` : "",
    beatHint ? `Carry forward these prior beats: ${beatHint}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildStoryCards(input: {
  requestKind?: JobRequestKind;
  subjectName?: string | null;
  subjectDescription?: string | null;
  requestedPrompt?: string | null;
  sourceTranscript?: string | null;
  sourceReferenceLabel?: string | null;
  storyBeats?: string[] | null;
  audioEnabled?: boolean | null;
}): StoryCard[] {
  const subject = input.subjectName?.trim() || "Untitled trailer";
  const description =
    trimSentence(input.subjectDescription?.trim() || "A short-form trailer brief enters the studio.");
  const direction =
    trimSentence(
      input.requestedPrompt?.trim() ||
        "Turn the idea into a cinematic short that feels exciting on replay.",
    );
  const transcriptLines = splitTranscript(input.sourceTranscript);
  const beats = input.storyBeats?.filter(Boolean) ?? [];
  const audioNote = input.audioEnabled
    ? "Narration or score may push the momentum."
    : "The visual edit must carry the momentum.";
  const tone = modeTone(input.requestKind);

  return [
    {
      id: "hook",
      phase: "hook",
      title: `${subject} / Hook`,
      teaser: beats[0] ?? description,
      visualCue: input.sourceReferenceLabel
        ? `Open with a ${tone} first image that quotes the source iconography from ${input.sourceReferenceLabel} before the world expands.`
        : `Open with a ${tone} first image that tells the audience what world they entered.`,
      narrationCue: takeTranscriptBeat(
        transcriptLines,
        0,
        `${subject} enters immediately, with no slow runway.`,
      ),
      transitionLabel: "Break in",
    },
    {
      id: "build",
      phase: "build",
      title: `${subject} / Build`,
      teaser: beats[1] ?? direction,
      visualCue:
        input.sourceReferenceLabel
          ? `Raise motion, scale, or camera aggression while keeping the protagonist and the source iconography from ${input.sourceReferenceLabel} stable.`
          : "Raise motion, scale, or camera aggression while keeping the protagonist or source iconography stable.",
      narrationCue: takeTranscriptBeat(
        transcriptLines,
        1,
        "The middle act should tighten, not sprawl.",
      ),
      transitionLabel: "Push harder",
    },
    {
      id: "payoff",
      phase: "payoff",
      title: `${subject} / Payoff`,
      teaser:
        beats[2] ??
        "Land on a frame that feels like a poster, a chorus drop, or a final line worth repeating.",
      visualCue:
        "Treat the climax like a trailer finish: strong silhouette, clear subject lock, and one unforgettable frame.",
      narrationCue: takeTranscriptBeat(
        transcriptLines,
        2,
        audioNote,
      ),
      transitionLabel: "Stick the landing",
    },
    {
      id: "continuation",
      phase: "continuation",
      title: `${subject} / Next Step`,
      teaser: continuationAngle(input.requestKind),
      visualCue:
        "Leave the final image open enough that a sequel card, second drop, or next chapter can branch cleanly.",
      narrationCue: trimSentence(buildContinuationPrompt(input)),
      transitionLabel: "Queue sequel",
    },
  ];
}
