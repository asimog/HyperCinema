import { JobRequestKind, StoryCard } from "@/lib/types/domain";

export type CardsAgentPlacement =
  | "main_card"
  | "title_page"
  | "end_page"
  | "interstitial"
  | "transition";

export type CardsAgentVisualAdapterKind = "cards" | "game_of_life" | "three_js";
export type CardsAgentRequestedComposition =
  | "cards"
  | "title_page"
  | "end_page"
  | "game_of_life"
  | "three_js";

export interface CardsAgentVisualAdapter {
  id: string;
  label: string;
  kind: CardsAgentVisualAdapterKind;
  summary: string;
  placements: CardsAgentPlacement[];
}

export interface CardsAgentProposal {
  target: CardsAgentPlacement;
  adapterId: string;
  label: string;
  reason: string;
}

function compositionLabel(composition: CardsAgentRequestedComposition): string {
  switch (composition) {
    case "cards":
      return "Cards Deck";
    case "title_page":
      return "Title Page";
    case "end_page":
      return "End Page";
    case "game_of_life":
      return "Game of Life";
    case "three_js":
      return "Three.js Stage";
  }
}

function buildRequestedCompositionProposal(
  subject: string,
  requestedComposition: CardsAgentRequestedComposition,
): CardsAgentProposal {
  const target: CardsAgentPlacement =
    requestedComposition === "cards"
      ? "main_card"
      : requestedComposition === "title_page"
        ? "title_page"
        : requestedComposition === "end_page"
          ? "end_page"
          : requestedComposition === "game_of_life"
            ? "interstitial"
            : "title_page";

  const adapterId =
    requestedComposition === "title_page" || requestedComposition === "three_js"
      ? "three_js"
      : requestedComposition === "end_page" || requestedComposition === "game_of_life"
        ? "game_of_life"
        : "cards";

  const reason =
    requestedComposition === "title_page"
      ? "Director requested the title_page composition explicitly."
      : requestedComposition === "end_page"
        ? "Director requested the end_page composition explicitly."
        : requestedComposition === "game_of_life"
          ? "Director requested the Game of Life composition explicitly."
          : requestedComposition === "three_js"
            ? "Director requested the Three.js composition explicitly."
            : "Director requested the working deck explicitly.";

  return {
    target,
    adapterId,
    label: `${subject} / ${compositionLabel(requestedComposition)}`,
    reason,
  };
}

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
    .map((line) => line.replace(/^\s*\d+\s*[-â€“:]\s*/, "").trim())
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

function buildVisualAdapters(requestKind: JobRequestKind | undefined): CardsAgentVisualAdapter[] {
  const cinematicMomentum = requestKind === "music_video" || requestKind === "scene_recreation";

  return [
    {
      id: "cards",
      label: "Cards Deck",
      kind: "cards",
      summary: "Readable text cards for beat structure, notes, and follow-on prompts.",
      placements: ["main_card", "interstitial", "transition"],
    },
    {
      id: "game_of_life",
      label: "Game of Life",
      kind: "game_of_life",
      summary:
        "Cellular automaton motion texture for transitions, soft openers, and reflective endings.",
      placements: ["title_page", "end_page", "interstitial", "transition"],
    },
    {
      id: "three_js",
      label: "Three.js Stage",
      kind: "three_js",
      summary:
        cinematicMomentum
          ? "Cinematic 3D environment for energetic openings, hero cards, and end slates."
          : "3D motion stage for title pages, feature calls, and polished closing cards.",
      placements: ["title_page", "end_page", "main_card", "transition"],
    },
  ];
}

function buildCardProposals(
  input: {
    requestKind?: JobRequestKind;
    subjectName?: string | null;
    subjectDescription?: string | null;
    requestedPrompt?: string | null;
    sourceReferenceLabel?: string | null;
    requestedComposition?: CardsAgentRequestedComposition | null;
  },
  visualAdapters: CardsAgentVisualAdapter[],
): CardsAgentProposal[] {
  const subject = input.subjectName?.trim() || "this trailer";
  const description =
    input.subjectDescription?.trim() || "the cards should stay readable and cinematic";
  const prompt = input.requestedPrompt?.trim();
  const reference = input.sourceReferenceLabel?.trim();

  return [
    {
      target: "title_page",
      adapterId: "three_js",
      label: `${subject} / Title Page`,
      reason:
        prompt && prompt.length > 0
          ? `Use Three.js when the director wants a stronger opening statement around: ${prompt}.`
          : `Use Three.js when the director wants a stronger opening statement for ${subject}.`,
    },
    {
      target: "end_page",
      adapterId: "game_of_life",
      label: `${subject} / End Page`,
      reason: reference
        ? `Use Game of Life as a living end card that echoes the source reference: ${reference}.`
        : `Use Game of Life as a living end card when the director wants the finish to keep moving.`,
    },
    {
      target: "interstitial",
      adapterId: "game_of_life",
      label: `${subject} / Interstitial`,
      reason:
        description.length > 0
          ? `Use the cellular pattern as a pacing reset between chapters while keeping ${description}.`
          : `Use the cellular pattern as a pacing reset between chapters.`,
    },
    {
      target: "main_card",
      adapterId: "cards",
      label: `${subject} / Working Deck`,
      reason:
        visualAdapters.find((adapter) => adapter.id === "cards")?.summary ??
        "Use the readable deck when the director needs structured notes.",
    },
  ];
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
    ? "A cinematic score may push the momentum; voice only if the brief explicitly asks for it."
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

export function buildCardsAgentDeck(input: {
  requestKind?: JobRequestKind;
  subjectName?: string | null;
  subjectDescription?: string | null;
  requestedPrompt?: string | null;
  requestedComposition?: CardsAgentRequestedComposition | null;
  sourceTranscript?: string | null;
  sourceReferenceLabel?: string | null;
  storyBeats?: string[] | null;
  audioEnabled?: boolean | null;
}): {
  title: string;
  subtitle: string;
  cards: StoryCard[];
  continuationPrompt: string;
  requestedComposition: CardsAgentRequestedComposition | null;
  visualAdapters: CardsAgentVisualAdapter[];
  proposals: CardsAgentProposal[];
} {
  const cards = buildStoryCards(input);
  const subject = input.subjectName?.trim() || "Untitled trailer";
  const visualAdapters = buildVisualAdapters(input.requestKind);
  const requestedComposition = input.requestedComposition ?? null;
  const title = `${subject} / CardsAgent`;
  const subtitle = requestedComposition
    ? `Remotion-backed card deck for ${modeTone(input.requestKind)} text generation. Requested mode: ${requestedComposition}.`
    : `Remotion-backed card deck for ${modeTone(input.requestKind)} text generation.`;
  const continuationPrompt = buildContinuationPrompt(input);
  const proposals = requestedComposition
    ? [
        buildRequestedCompositionProposal(subject, requestedComposition),
        ...buildCardProposals(input, visualAdapters),
      ]
    : buildCardProposals(input, visualAdapters);

  return {
    title,
    subtitle,
    cards,
    continuationPrompt,
    requestedComposition,
    visualAdapters,
    proposals,
  };
}
