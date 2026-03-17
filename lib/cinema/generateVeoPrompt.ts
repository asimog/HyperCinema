import { createCinemaRng, stablePick } from "@/lib/cinema/constants";
import type {
  EntropyLevel,
  SceneDefinition,
  ScenePlan,
  SceneType,
  StoryState,
  TokenImageMoment,
  VeoPromptPackage,
  VeoScenePrompt,
} from "@/lib/cinema/types";

function uniq(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function shortProtagonist(state: StoryState): string {
  switch (state.archetype.id) {
    case "gambler":
      return "a hooded memecoin gambler with tired eyes under neon screen-glow";
    case "prophet":
      return "a quiet trench seer watching the market like constellations";
    case "survivor":
      return "a battle-worn trader still standing in the trenches";
    case "martyr":
      return "a stoic bagholder holding the line against the night";
    case "trickster":
      return "a smirking trickster trader walking through glitch doors";
    case "pilgrim":
      return "a trench pilgrim searching for meaning between flickering signs";
    case "believer":
      return "a believer building a shrine out of posters and hope";
    case "chaser":
      return "a breathless chaser sprinting toward a departing candle";
    case "alchemist":
      return "an alchemist trader turning chaos into a volatile experiment";
    case "ghost":
      return "a ghostlike trader, present like a shadow under blue haze";
    default:
      return "a trader protagonist haunted by the glow of the trenches";
  }
}

function titleForState(state: StoryState): string {
  const tokenSymbol =
    state.tokenImagePlan.imageMoments.find((moment) => moment.sceneType === "opening")?.symbol ??
    state.tokenImagePlan.imageMoments[0]?.symbol;

  const base = (() => {
    switch (state.characterArc.id) {
      case "villain":
        return "The Rematch Bell";
      case "hero":
        return "Sunrise Exit";
      case "jester":
        return "Funhouse Tape";
      case "martyr":
        return "The Empty Casino";
      case "survivor":
        return "Last Train Out";
      case "prophet":
        return "Omen In Neon";
      case "trickster":
        return "Glitch Door";
      case "fallen_hero":
        return "Gold To Static";
      case "pilgrim":
        return "Platform Light";
      case "ghost":
        return "Blue Haze";
      default:
        return "Neon Trenches";
    }
  })();

  return tokenSymbol ? `${base} (${tokenSymbol})` : base;
}

function taglineForState(state: StoryState): string {
  switch (state.characterArc.id) {
    case "villain":
      return "Every loss becomes an insult, and the arena always asks for one more round.";
    case "hero":
      return "In the trenches, clarity is the rarest win.";
    case "jester":
      return "The market laughs back, and somehow the punchline lands.";
    case "martyr":
      return "He holds the bag like a relic, even when the room goes quiet.";
    case "survivor":
      return "Damage lands, but he finds a way to breathe again.";
    case "prophet":
      return "He sees the move before the city does, and pays the price for believing it.";
    case "trickster":
      return "Every door is a trap until one becomes an exit.";
    case "fallen_hero":
      return "He starts in gold, then learns what static sounds like at dawn.";
    case "pilgrim":
      return "A journey through neon fog, searching for the one sign that stays true.";
    case "ghost":
      return "Quiet trades, loud shadows, and a presence that never fully speaks.";
    default:
      return "A trench myth about a trader and the night that shaped him.";
  }
}

function shotForEntropy(entropy: EntropyLevel, sceneType: SceneType, rng: () => number): string {
  const low = ["wide establishing shot", "locked-off medium shot", "slow close-up"];
  const medium = ["tracking shot", "steady handheld medium", "over-the-shoulder push-in"];
  const high = ["crash close-up", "whip-pan insert", "hero shot with snap-zoom"];

  const pool = entropy === "high" ? high : entropy === "low" ? low : medium;
  const typeBias =
    sceneType === "absolute_cinema" ? ["hero shot with crane rise", ...pool] : pool;

  return stablePick(typeBias, rng);
}

function cameraForEntropy(entropy: EntropyLevel, sceneType: SceneType, rng: () => number): string {
  const low = ["slow dolly push-in", "gentle pan", "static frame with subtle drift"];
  const medium = ["handheld glide", "tracking follow", "dolly zoom into tension"];
  const high = ["aggressive handheld", "whip pans and snap zooms", "rapid cuts with motion blur"];

  const pool = entropy === "high" ? high : entropy === "low" ? low : medium;
  const typeBias =
    sceneType === "opening"
      ? ["slow dolly push-in", ...pool]
      : sceneType === "damage" || sceneType === "collapse"
        ? ["aggressive handheld", ...pool]
        : pool;

  return stablePick(typeBias, rng);
}

function atmosphere(entropy: EntropyLevel): string {
  switch (entropy) {
    case "high":
      return "storms of pixel dust, sparks, flicker, and rain slicing through light";
    case "medium":
      return "fog and tension, neon reflections trembling, subtle glitch artifacts";
    case "low":
      return "quiet haze, dust motes, soft rain on glass, steady air";
    default:
      return "neon haze";
  }
}

function soundCues(scene: SceneDefinition, state: StoryState): string[] {
  // Coherent audio rule:
  // - Keep 2-3 leitmotifs consistent across the whole film.
  // - Add act/entropy accents to escalate in Act 2 and resolve in Act 3.
  // - Avoid random genre jumps by avoiding full shuffles.

  const canonRng = createCinemaRng(`sound_canon:${state.wallet}:${state.rangeHours}`);

  const arcMotif =
    state.characterArc.id === "villain"
      ? "dark synth pulse"
      : state.characterArc.id === "jester"
        ? "quirky synth riff"
        : state.characterArc.id === "prophet"
          ? "choir-like pad"
          : state.characterArc.id === "martyr"
            ? "slow string pad"
            : state.characterArc.id === "ghost"
              ? "hollow synth bed"
              : state.characterArc.id === "survivor" || state.characterArc.id === "hero"
                ? "warm synth rise"
                : "clean ambient pad";

  const environmentMotif =
    state.emotionalSignals.chaos >= 0.55 ? "soft synth wash" : "clean ambient pad";

  const archetypeMotif = stablePick(
    uniq([
      ...state.archetype.preferredSoundProfile,
      "cinematic synth pulse",
      "clean rhythmic tick",
    ]),
    canonRng,
  );

  const leitmotifs = uniq([
    "cinematic synth pulse",
    environmentMotif,
    arcMotif,
    archetypeMotif,
  ]).slice(0, 3);

  const actAccents =
    scene.actNumber === 1
      ? ["soft pad", "low pulse"]
      : scene.actNumber === 3
        ? ["gentle resolve", "soft piano wash"]
        : ["driving synth pulse", "rising arpeggio"];

  const entropyAccents =
    scene.entropy === "high"
      ? ["tight low-end drive"]
      : scene.entropy === "low"
        ? ["warm pad drift"]
        : ["clean synth lift"];

  const sceneSignature =
    scene.sceneType === "absolute_cinema"
      ? ["brief orchestral swell"]
      : scene.sceneType === "aftermath"
        ? ["warm resolve"]
        : scene.sceneType === "villain_turn"
          ? ["dark synth pulse"]
          : scene.sceneType === "jester_turn"
            ? ["playful synth riff"]
            : [];

  const ordered = uniq([
    "background music bed",
    "voiceover commentary",
    ...leitmotifs,
    ...actAccents,
    ...entropyAccents,
    ...sceneSignature,
    ...state.archetype.preferredSoundProfile,
  ]).filter(Boolean);

  const cap = scene.entropy === "high" ? 4 : scene.entropy === "low" ? 3 : 4;
  return ordered.slice(0, cap);
}

function tokenMomentsForSceneType(state: StoryState, sceneType: SceneType): TokenImageMoment[] {
  return state.tokenImagePlan.imageMoments.filter((moment) => moment.sceneType === sceneType);
}

function tokenIntegrationLines(moments: TokenImageMoment[]): string[] {
  if (!moments.length) return [];
  return moments.map((moment) => {
    const label = moment.symbol ? `${moment.symbol}` : moment.mint.slice(0, 6);
    const image = moment.image ? `image=${moment.image}` : "image=none";
    return `Token image integration: ${label} appears as ${moment.placementHint} (${image}).`;
  });
}

function scenePromptText(input: {
  state: StoryState;
  scene: SceneDefinition;
}): { prompt: string; sound: string[]; tokenRefs: VeoScenePrompt["tokenImageRefs"] } {
  const rng = createCinemaRng(
    `scene_prompt:${input.state.wallet}:${input.state.rangeHours}:${input.scene.sceneIndex}`,
  );

  const protagonist = shortProtagonist(input.state);
  const shot = shotForEntropy(input.scene.entropy, input.scene.sceneType, rng);
  const camera = cameraForEntropy(input.scene.entropy, input.scene.sceneType, rng);
  const env = input.scene.metaphor?.environment ?? input.state.archetype.preferredVisualMotifs[0] ?? "neon trenches";
  const lighting = input.scene.metaphor?.lighting ?? "screen glow and hard contrast";
  const palette = (input.scene.metaphor?.colorPalette?.length
    ? input.scene.metaphor.colorPalette
    : input.state.visualThemes.slice(0, 3)
  ).slice(0, 4);
  const metaphorHints = input.scene.metaphor?.promptLanguageHints ?? [];

  const tokenMoments = tokenMomentsForSceneType(input.state, input.scene.sceneType);
  const tokenLines = tokenIntegrationLines(tokenMoments);
  const tokenRefs = tokenMoments.map((moment) => ({
    mint: moment.mint,
    image: moment.image,
    placementHint: moment.placementHint,
  }));

  const sound = soundCues(input.scene, input.state);

  const action = (() => {
    switch (input.scene.sceneType) {
      case "opening":
        return "He steps into the glow, hands hovering over the keyboard like a ritual.";
      case "discovery":
        return "He notices the first omen and leans closer, eyes reflecting the city's flicker.";
      case "temptation":
        return "He chases the light like it owes him a rescue, breath audible in the room.";
      case "first_conviction":
        return "He makes the vow anyway, jaw set, posture calm, fingers steady.";
      case "momentum":
        return "He moves fast, but his face stays locked on the next door before it shuts.";
      case "damage":
        return "A hit lands; he flinches, then re-enters like the wound is a dare.";
      case "escalation":
        return "The night speeds up; he keeps clicking as the world starts to strobe.";
      case "villain_turn":
        return "He becomes the villain of his own story, doubling down with a cold smile.";
      case "jester_turn":
        return "He laughs once, then the market laughs back; he keeps dancing anyway.";
      case "collapse":
        return "The set collapses; he scrambles for footing, still trying to force a miracle.";
      case "comeback":
        return "He finds one clean breath and pivots; survival becomes an act of craft.";
      case "main_character":
        return "Spotlight: he stands center-frame, carrying the night like armor.";
      case "trench_lore":
        return "He walks past the city's receipts; posters and mascots watch him like witnesses.";
      case "absolute_cinema":
        return "The climax erupts: myth and consequence collide in one unforgettable shot.";
      case "aftermath":
        return "Sunrise. He sits in the quiet, letting the last glow fade without explaining it.";
      default:
        return "He keeps moving through the trench world, unreadable but present.";
    }
  })();

  const promptLines = [
    `${shot}. Camera movement: ${camera}.`,
    `Environment: ${env}.`,
    `Trader protagonist: ${protagonist}. Action: ${action}`,
    input.scene.metaphor?.id ? `Visual metaphor: ${input.scene.metaphor.id}.` : "",
    metaphorHints.length ? `Metaphor language hints: ${metaphorHints.slice(0, 4).join(", ")}.` : "",
    tokenLines.join(" "),
    `Lighting: ${lighting}.`,
    `Color palette: ${palette.join(", ")}.`,
    `Atmosphere: ${atmosphere(input.scene.entropy)}.`,
    `Sound design: ${sound.join(", ")}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return { prompt: promptLines, sound, tokenRefs };
}

function buildContinuousPrompt(input: {
  title: string;
  tagline: string;
  state: StoryState;
  scenes: Array<{ scene: SceneDefinition; prompt: string }>;
}): string {
  const guardrails = [
    "Generate one continuous short film for Google Veo WITH SOUND.",
    "This is cinema, not analytics: never show or say balances, PnL numbers, percentages, trade counts, charts-as-the-only-subject, or UI dashboards.",
    "Facts-first rule: do not invent factual trades, tokens, or events. Use token images only when provided as anchors.",
    "Continuity: keep one trader protagonist present (or strongly implied) in every scene; maintain visual motif continuity across scenes.",
    "Token image rule: when an image URL is provided, treat it as an in-world poster, hologram, billboard, shrine, reflection, or mascot apparition, not a UI thumbnail.",
    "Audio rule: continuous background music bed with sparse voiceover commentary only. No character dialogue. No SFX, no crowd noise, no alarms, no distortion.",
  ].join("\n");

  const identity = [
    `Cinematic title: ${input.title}`,
    `Tagline: ${input.tagline}`,
    `Archetype: ${input.state.archetype.displayName} (${input.state.archetype.tone}).`,
    `Character arc: ${input.state.characterArc.displayName} (${input.state.characterArc.synopsis}).`,
    `3-act structure:`,
    input.state.threeActArc.act1,
    input.state.threeActArc.act2,
    input.state.threeActArc.act3,
    `Continuity motifs: ${uniq([...input.state.visualThemes, ...input.state.symbolicObjects]).slice(0, 10).join("; ")}.`,
  ].join("\n");

  const scenesText = input.scenes
    .map(({ scene, prompt }) => {
      return [
        `Scene ${scene.sceneIndex}: (${scene.sceneType}, Act ${scene.actNumber}, ${scene.durationSeconds}s, entropy=${scene.entropy})`,
        prompt,
      ].join("\n");
    })
    .join("\n\n");

  return [guardrails, "", identity, "", scenesText].join("\n");
}

function buildCompactPrompt(input: {
  title: string;
  tagline: string;
  scenes: Array<{ scene: SceneDefinition; prompt: string }>;
}): string {
  const lines = input.scenes.map(({ scene, prompt }) => {
    const compact = prompt
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;!?])/g, "$1")
      .trim();
    const trimmed = compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
    return `Scene ${scene.sceneIndex} (${scene.sceneType}, ${scene.durationSeconds}s): ${trimmed}`;
  });

  return [`${input.title} - ${input.tagline}`, ...lines].join("\n");
}

export function generateVeoPromptPackage(input: {
  storyState: StoryState;
  scenePlan: ScenePlan;
}): Omit<VeoPromptPackage, "scenePlan" | "storyState"> & {
  title: string;
  tagline: string;
  scenePrompts: VeoScenePrompt[];
  prompt: string;
  promptCompact: string;
} {
  const title = titleForState(input.storyState);
  const tagline = taglineForState(input.storyState);

  const scenePrompts: VeoScenePrompt[] = input.scenePlan.scenes.map((scene) => {
    const { prompt, sound, tokenRefs } = scenePromptText({ state: input.storyState, scene });
    return {
      sceneIndex: scene.sceneIndex,
      sceneType: scene.sceneType,
      actNumber: scene.actNumber,
      durationSeconds: scene.durationSeconds,
      entropy: scene.entropy,
      prompt,
      soundCues: sound,
      tokenImageRefs: tokenRefs,
      metaphorId: scene.metaphor?.id,
    };
  });

  const scenesForPrompt = scenePrompts.map((scenePrompt) => ({
    scene: input.scenePlan.scenes.find((s) => s.sceneIndex === scenePrompt.sceneIndex)!,
    prompt: scenePrompt.prompt,
  }));

  const prompt = buildContinuousPrompt({
    title,
    tagline,
    state: input.storyState,
    scenes: scenesForPrompt,
  });

  const promptCompact = buildCompactPrompt({
    title,
    tagline,
    scenes: scenesForPrompt,
  });

  return { title, tagline, scenePrompts, prompt, promptCompact };
}
