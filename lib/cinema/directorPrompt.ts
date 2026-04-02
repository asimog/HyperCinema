import type { PackageType, RequestedTokenChain } from "@/lib/types/domain";

export interface DirectorPromptInput {
  categoryTitle: string;
  subjectName: string;
  subjectDescription?: string;
  sourceMediaUrl?: string;
  sourceTranscript?: string;
  storyNotes?: string;
  characterReferences?: string;
  visualReferences?: string;
  lyrics?: string;
  dialogue?: string;
  imageReferences?: string[];
  packageType?: PackageType;
  audioEnabled?: boolean;
  chain?: RequestedTokenChain;
  requestKind?: string;
}

function compact(lines: Array<string | null | undefined>): string[] {
  return lines
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line));
}

export function buildDirectorPrompt(input: DirectorPromptInput): string {
  const lines = compact([
    `Project: ${input.subjectName}`,
    `Category: ${input.categoryTitle}`,
    input.requestKind ? `Format: ${input.requestKind}` : null,
    input.chain ? `Chain context: ${input.chain}` : null,
    input.subjectDescription ? `Core brief: ${input.subjectDescription}` : null,
    input.storyNotes ? `Story notes: ${input.storyNotes}` : null,
    input.characterReferences ? `Character references: ${input.characterReferences}` : null,
    input.visualReferences ? `Visual references: ${input.visualReferences}` : null,
    input.lyrics ? `Lyrics or rhythm cues: ${input.lyrics}` : null,
    input.dialogue ? `Dialogue or narration: ${input.dialogue}` : null,
    input.sourceMediaUrl ? `Reference URL: ${input.sourceMediaUrl}` : null,
    input.sourceTranscript ? `Reference transcript: ${input.sourceTranscript}` : null,
    input.imageReferences?.length
      ? `Image references: ${input.imageReferences.filter(Boolean).join(", ")}`
      : null,
    input.packageType ? `Runtime package: ${input.packageType}` : null,
    typeof input.audioEnabled === "boolean"
      ? `Audio: ${input.audioEnabled ? "on" : "off"}`
      : null,
    "",
    "Director upgrades:",
    "- Open with a strong hook in the first 2 seconds.",
    "- Keep each beat visually legible and emotionally specific.",
    "- Use one dominant idea per shot so the frame does not feel cluttered.",
    "- Build motion with purpose: foreground, midground, and background should work together.",
    "- Vary shot scale only when the emotion or story beat changes.",
    "- Favor clean transitions and a clear pacing arc.",
    "- Aim for one memorable money shot near the climax.",
    "- End on a frame that feels resolved, not generic.",
    "- Avoid repetition, dead middle energy, and incoherent endings.",
  ]);

  if (input.categoryTitle === "Music") {
    lines.push(
      "- Sync cuts to musical accents and phrase changes, not every single beat.",
      "- Let the chorus or drop widen the frame and raise the visual stakes.",
    );
  }

  if (input.categoryTitle === "Family") {
    lines.push(
      "- Keep the tone warm, safe, and easy to follow for non-technical viewers.",
      "- Make the emotional arc feel intimate, grateful, and clear.",
    );
  }

  if (input.categoryTitle === "TrenchMyths") {
    lines.push(
      "- Keep the crypto energy readable without turning the frame into clutter.",
      "- Use symbols, glow, and chart language only when they strengthen the beat.",
    );
  }

  if (input.categoryTitle === "FunMyths") {
    lines.push(
      "- Push weirdness, but keep the joke legible and the frame controlled.",
      "- Let the absurdity land through contrast, not visual noise.",
    );
  }

  return lines.join("\n");
}
