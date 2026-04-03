import { createCinemaRng, stablePick } from "@/lib/cinema/constants";
import type {
  SceneType,
  SoundDirectorPackage,
  SoundSceneDirective,
  VeoPromptPackage,
  VeoScenePrompt,
} from "@/lib/cinema/types";

function uniq(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function actForSceneType(sceneType: SceneType): 1 | 2 | 3 {
  switch (sceneType) {
    case "opening":
    case "discovery":
    case "temptation":
      return 1;
    case "aftermath":
      return 3;
    default:
      return 2;
  }
}

function deriveBed(actNumber: 1 | 2 | 3, beds: { act1: string; act2: string; act3: string }): string {
  if (actNumber === 1) return beds.act1;
  if (actNumber === 3) return beds.act3;
  return beds.act2;
}

function accentForScene(sceneType: SceneType): string {
  switch (sceneType) {
    case "absolute_cinema":
      return "brief orchestral swell";
    case "escalation":
      return "tight low-end drive";
    case "damage":
    case "collapse":
      return "tense low pulse";
    case "villain_turn":
      return "dark synth stab";
    case "jester_turn":
      return "playful synth riff";
    case "comeback":
    case "first_conviction":
      return "clean synth lift";
    case "aftermath":
      return "warm resolve";
    case "opening":
      return "soft pad swell";
    default:
      return "soft pad drift";
  }
}

function buildLeitmotifs(pkg: VeoPromptPackage): string[] {
  const rng = createCinemaRng(
    `sound_director:${pkg.storyState.wallet}:${pkg.storyState.rangeHours}`,
  );

  const arcMotif = (() => {
    switch (pkg.storyState.characterArc.id) {
      case "villain":
        return "dark synth pulse";
      case "jester":
        return "quirky synth riff";
      case "prophet":
        return "choir-like pad";
      case "martyr":
        return "slow string pad";
      case "ghost":
        return "hollow synth bed";
      case "survivor":
      case "hero":
        return "warm synth rise";
      default:
        return "clean ambient pad";
    }
  })();

  const chaosMotif =
    pkg.storyState.emotionalSignals.chaos >= 0.55
      ? "soft synth wash"
      : "clean ambient pad";

  const archetypeMotif = stablePick(
    uniq([
      ...pkg.storyState.archetype.preferredSoundProfile,
      "cinematic synth pulse",
      "clean rhythmic tick",
    ]),
    rng,
  );

  return uniq([
    "cinematic synth pulse",
    chaosMotif,
    arcMotif,
    archetypeMotif,
  ]).slice(0, 3);
}

function buildActBeds(pkg: VeoPromptPackage): {
  act1: string;
  act2: string;
  act3: string;
} {
  const archetype = pkg.storyState.archetype.id;
  const chaos = pkg.storyState.emotionalSignals.chaos;

  const act1 =
    archetype === "ghost" || archetype === "martyr"
      ? "very soft ambient pad, near silence"
      : archetype === "gambler" || archetype === "chaser"
        ? "low pulse build with warm pad"
        : "soft intimate synth bed";

  const act2 =
    chaos >= 0.65
      ? "driving synth bed with tight low-end pulse and rising arpeggio"
      : chaos >= 0.4
        ? "mid-intensity synth bed, rhythmic pulse"
        : "measured synth swell, controlled tension";

  const act3 =
    archetype === "ghost" || archetype === "martyr"
      ? "cold resolved synth, sparse and final"
      : archetype === "survivor" || archetype === "believer"
        ? "warm resolved bed with gentle lift"
        : "neutral resolved synth bed, soft piano wash";

  return { act1, act2, act3 };
}

function buildSceneDirectives(
  scenePrompts: VeoScenePrompt[],
  leitmotifs: string[],
  beds: { act1: string; act2: string; act3: string },
): SoundSceneDirective[] {
  return scenePrompts.map((sp) => {
    const actNumber = actForSceneType(sp.sceneType);
    const musicBed = deriveBed(actNumber, beds);
    const accent = accentForScene(sp.sceneType);

    const perSceneMotifs = uniq([
      ...leitmotifs,
      ...sp.soundCues.filter((cue) => !leitmotifs.includes(cue)),
    ]).slice(0, 4);

    return {
      sceneIndex: sp.sceneIndex,
      sceneType: sp.sceneType,
      actNumber,
      musicBed,
      motifs: perSceneMotifs,
      accent,
    };
  });
}

function buildSoundPrompt(input: {
  pkg: VeoPromptPackage;
  leitmotifs: string[];
  beds: { act1: string; act2: string; act3: string };
  directives: SoundSceneDirective[];
}): string {
  const { pkg, leitmotifs, beds, directives } = input;

  const header = [
    "SOUND DIRECTOR BRIEF — for attachment to the video generation prompt.",
    "Audio format: cinematic score + atmospheric sound design only unless speech is explicitly requested.",
    "No narration by default, no character dialogue unless requested, no crowd noise, no alarms, no distortion, no clipping.",
    "Maintain one continuous sound world across all scenes; never switch genre or break leitmotif continuity.",
  ].join("\n");

  const leitmotifLine = `Leitmotifs (keep present across every scene): ${leitmotifs.join(", ")}.`;

  const bedLines = [
    `Act 1 music bed: ${beds.act1}.`,
    `Act 2 music bed: ${beds.act2}.`,
    `Act 3 music bed: ${beds.act3}.`,
  ].join("\n");

  const sceneLines = directives
    .map((d) =>
      [
        `Scene ${d.sceneIndex} (${d.sceneType}, Act ${d.actNumber})`,
        `bed=${d.musicBed}`,
        `motifs=${d.motifs.join("+")}`,
        `accent=${d.accent}`,
      ].join(" | "),
    )
    .join("\n");

  const archetype = `Archetype tone: ${pkg.storyState.archetype.displayName} — ${pkg.storyState.archetype.tone}.`;
  const arc = `Character arc: ${pkg.storyState.characterArc.displayName}.`;

  return [header, "", archetype, arc, "", leitmotifLine, "", bedLines, "", "Scene sound reel:", sceneLines].join("\n");
}

export function buildSoundDirectorPackage(pkg: VeoPromptPackage): SoundDirectorPackage {
  const leitmotifs = buildLeitmotifs(pkg);
  const beds = buildActBeds(pkg);
  const directives = buildSceneDirectives(pkg.scenePrompts, leitmotifs, beds);
  const soundPrompt = buildSoundPrompt({ pkg, leitmotifs, beds, directives });

  return {
    leitmotifs,
    act1Bed: beds.act1,
    act2Bed: beds.act2,
    act3Bed: beds.act3,
    sceneDirectives: directives,
    soundPrompt,
  };
}
