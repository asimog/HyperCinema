import { VIDEO_MOTIFS, VIDEO_VISUAL_SYMBOLS } from "./contentBank";
import {
  StoryBeat,
  VideoPromptProvider,
  VideoPromptScene,
  WalletMetrics,
  WalletMoments,
} from "./types";

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildNarrativePurpose(beat: StoryBeat, momentTitle?: string): string {
  switch (beat.phase) {
    case "opening":
      return "Introduce the wallet, pace, and emotional operating mode.";
    case "rise":
      return "Show momentum, confidence, or early narrative traction building.";
    case "damage":
      return "Visualize pain, reversals, or the market pushing back.";
    case "pivot":
      return "Capture the decision point between collapse, re-entry, and conviction.";
    case "climax":
      return momentTitle
        ? `Center the scene around ${momentTitle} as the cinematic high point.`
        : "Land the most watchable or painful candle sequence of the window.";
    case "aftermath":
      return "Resolve the session with the final emotional and scoreboard state.";
    default:
      return "Translate the beat into a cinematic memecoin recap scene.";
  }
}

function providerPrompt(
  provider: VideoPromptProvider,
  scene: Omit<VideoPromptScene, "providerPrompts">,
): string {
  const common = [
    `${scene.shotType} in ${scene.environment}.`,
    `Camera movement: ${scene.cameraMovement}.`,
    `Character action: ${scene.characterAction}.`,
    `Visual style: ${scene.visualStyle}.`,
    `Lighting: ${scene.lighting}.`,
    `Sound design: ${scene.soundDesign}.`,
    `Recurring symbols: ${scene.symbolicVisuals.join(", ")}.`,
    `Narrative anchor: ${scene.narrationHook}.`,
    "No fake numbers, no invented trades, no fabricated token labels.",
  ];

  if (provider === "veo") {
    return [
      ...common,
      "Use bold kinetic captions, coherent scene transitions, and meme-native cinematic pacing.",
      "Favor camera realism with stylized motion graphics layered over the scene.",
    ].join(" ");
  }

  if (provider === "runway") {
    return [
      ...common,
      "Favor highly visual motion, dramatic transitions, and stylized realism over literal UI recreation.",
      "Keep the frame composition readable for trailer-like storytelling.",
    ].join(" ");
  }

  return [
    ...common,
    "Favor high-impact motion, crisp subject separation, and cinematic spectacle with surreal chart symbolism.",
    "Keep movement fluid and dramatic without turning the scene into abstract noise.",
  ].join(" ");
}

function pickMomentTitle(input: { phase: StoryBeat["phase"]; moments: WalletMoments }): string | undefined {
  if (input.phase === "damage") {
    return (
      input.moments.mostUnwellMoment?.title ??
      input.moments.fumbleMoment?.title ??
      input.moments.overcookedMoment?.title
    );
  }
  if (input.phase === "climax") {
    return (
      input.moments.mainCharacterMoment?.title ??
      input.moments.trenchLoreMoment?.title ??
      input.moments.absoluteCinemaMoment?.title
    );
  }
  if (input.phase === "pivot") {
    return input.moments.comebackMoment?.title ?? input.moments.convictionMoment?.title;
  }
  return undefined;
}

export function generateVideoPromptSequence(input: {
  wallet: string;
  metrics: WalletMetrics;
  personality: string;
  modifiers: string[];
  storyBeats: StoryBeat[];
  moments: WalletMoments;
}): VideoPromptScene[] {
  const seedBase = hashString(
    [
      input.wallet,
      input.personality,
      ...input.modifiers,
      input.metrics.activity.tradeCount,
      input.metrics.pnl.estimatedPnlSol,
    ].join("|"),
  );

  const beatCount = clamp(input.storyBeats.length, 5, 8);
  return input.storyBeats.slice(0, beatCount).map((beat, index) => {
    const motif = VIDEO_MOTIFS[beat.phase];
    const localSeed = seedBase + index * 97;
    const symbolicVisuals = [
      pick(VIDEO_VISUAL_SYMBOLS, localSeed),
      pick(VIDEO_VISUAL_SYMBOLS, localSeed + 11),
    ].filter((value, position, values) => values.indexOf(value) === position);
    const momentTitle = pickMomentTitle({ phase: beat.phase, moments: input.moments });

    const sceneBase: Omit<VideoPromptScene, "providerPrompts"> = {
      sceneNumber: index + 1,
      phase: beat.phase,
      narrativePurpose: buildNarrativePurpose(beat, momentTitle),
      shotType: pick(motif.shotTypes, localSeed + 3),
      cameraMovement: pick(motif.cameraMoves, localSeed + 5),
      environment: pick(motif.environments, localSeed + 7),
      characterAction: pick(motif.actions, localSeed + 13),
      visualStyle: pick(motif.styles, localSeed + 17),
      lighting: pick(motif.lighting, localSeed + 19),
      soundDesign: pick(motif.sound, localSeed + 23),
      symbolicVisuals,
      narrationHook: beat.text,
    };

    return {
      ...sceneBase,
      providerPrompts: {
        veo: providerPrompt("veo", sceneBase),
        runway: providerPrompt("runway", sceneBase),
        kling: providerPrompt("kling", sceneBase),
      },
    };
  });
}
