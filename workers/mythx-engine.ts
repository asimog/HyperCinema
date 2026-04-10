// MythX Engine — 90s Anime CRT video generation for X bot
// Ported from Python mythx_engine.py v6.2
// Generates 3-act cinematic prompts with CRT physics, anime sub-styles,
// sentiment-aware sampling, and seamless video stitching.

import { generateTextInferenceJson } from "@/lib/inference/text";

// ═══════════════════════════════════════════════════════════════════
// CRT PHYSICS BLOCK — mandatory in every single clip prompt
// ═══════════════════════════════════════════════════════════════════

export const CRT_PHYSICS_BLOCK =
  "strong visible horizontal scanlines across the entire frame, " +
  "intense phosphor glow and bloom on bright areas especially energy and highlights, " +
  "visible RGB color convergence fringing with red and blue shifts on high-contrast edges, " +
  "soft analog video blur and slight ghosting on fast motion, " +
  "warm nostalgic color grading with boosted reds and yellows, " +
  "subtle barrel distortion and screen curvature, " +
  "analog video noise and faint tracking lines, " +
  "phosphor persistence trails on bright objects, " +
  "slight moire patterns from the camcorder recording the CRT, " +
  "authentic late-90s broadcast CRT look with holographic transmission feel";

// ═══════════════════════════════════════════════════════════════════
// 16 CLASSIC 90s ANIME SUB-STYLES
// ═══════════════════════════════════════════════════════════════════

export const NINETIES_ANIME_SUBSTYLES = [
  "Dragon Ball Z epic shonen style",
  "Pokémon adventurous vibrant style",
  "Sailor Moon magical girl dramatic style",
  "Yu Yu Hakusho dark tournament style",
  "Berserk grimdark fantasy style",
  "Cowboy Bebop noir jazz style",
  "Neon Genesis Evangelion psychological mecha style",
  "Trigun western sci-fi style",
  "Hunter x Hunter adventurous style",
  "JoJo's Bizarre Adventure stylish pose style",
  "One Piece early pirate adventure style",
  "Rurouni Kenshin samurai action style",
  "Slam Dunk sports intensity style",
  "Ghost in the Shell cyberpunk style",
  "Cardcaptor Sakura cute magical style",
  "Inuyasha feudal fantasy style",
];

// ═══════════════════════════════════════════════════════════════════
// 16 EPIC THEMES
// ═══════════════════════════════════════════════════════════════════

export const EPIC_THEMES = [
  "glorious heroic saga", "epic arena battle legend", "anime fable destiny",
  "cinematic revenge odyssey", "mythic warrior ascension", "futuristic rebellion epic",
  "ancient prophecy fulfilled", "cosmic god-war chronicle", "noir shadow empire fall",
  "high-stakes tournament saga", "dreamlike fable awakening", "steampunk revolution tale",
  "post-apocalypse redemption arc", "cybernetic soul quest", "interstellar alliance war",
  "timeless love vs fate chronicle",
];

// ═══════════════════════════════════════════════════════════════════
// 16 SUB-ARENAS
// ═══════════════════════════════════════════════════════════════════

export const SUB_THEMES = [
  "colosseum of gods thunder arena", "neon-lit cyber arena deathmatch", "floating sky island tournament",
  "volcanic lava battle coliseum", "ancient ruin temple duel ground", "zero-gravity space station warzone",
  "underwater crystal arena clash", "desert sandstorm fortress siege", "ice crystal palace throne battle",
  "dream realm portal arena", "cybertruck convoy highway chase", "xAI colossus core chamber fight",
  "mars red dust gladiator pit", "tokyo rooftop neon showdown", "medieval dragon arena", "quantum realm rift battlefield",
];

// ═══════════════════════════════════════════════════════════════════
// 16 CINEMATIC TECHNIQUES
// ═══════════════════════════════════════════════════════════════════

export const CINEMATIC_TECH = [
  "slow majestic dolly zoom on subject dominating arena",
  "dynamic orbiting camera circling intense battle interaction",
  "fast whip-pan following subject charging through chaos",
  "slow-motion heroic push-in as world reacts to subject",
  "epic overhead crane reveal of massive arena scale",
  "first-person immersive glide through battlefield",
  "low-angle upward shot of subject unleashing power",
  "circular orbit around subject clashing with arena forces",
  "rapid dramatic zoom during critical strike moments",
  "elegant slow pan across subject face amid destruction",
  "shaky intense action cam tracking furious combat",
  "intimate eye-level tracking of emotional arena moments",
  "sweeping wide crane rise as subject claims victory",
  "futuristic floating glitch cam pursuing subject",
  "dramatic light-flare tracking through smoke and fire",
  "volumetric god-ray push through arena debris",
];

// ═══════════════════════════════════════════════════════════════════
// Sentiment-biased theme pools
// ═══════════════════════════════════════════════════════════════════

const _POSITIVE_THEMES = EPIC_THEMES.filter((t) =>
  ["heroic", "redemption", "awakening", "destiny", "fable", "ascension"].some((w) => t.includes(w)),
);
const _NEGATIVE_THEMES = EPIC_THEMES.filter((t) =>
  ["revenge", "empire fall", "war", "rebellion", "shadow", "odyssey"].some((w) => t.includes(w)),
);

// ═══════════════════════════════════════════════════════════════════
// Premium creative direction (triggered when mention tweet >= 100 likes)
// ═══════════════════════════════════════════════════════════════════

export const PREMIUM_CREATIVE_DIRECTION =
  "ultra-cinematic masterpiece, maximum emotional impact, " +
  "highly detailed keyframe animation, award-winning direction, " +
  "epic scale, breathtaking visuals, perfect composition";

// ═══════════════════════════════════════════════════════════════════
// Language options
// ═══════════════════════════════════════════════════════════════════

export const LANGUAGE_OPTIONS: Record<string, string> = {
  mythx: "english",
  "mythx japanese": "japanese",
  "mythx chinese": "chinese",
  "mythx russian": "russian",
};

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface MythXSentiment {
  flavor: "heroic" | "chaotic" | "reflective" | "savage" | "triumphant" | "melancholic" | "furious" | "serene";
  intensity: "low" | "medium" | "high";
  overall: "positive" | "neutral" | "negative";
}

export interface MythXCombo {
  theme: string;
  arena: string;
  subStyle: string;
  tech: string;
  sentiment: MythXSentiment;
  style: "holographic_crt" | "truman_show";
  premium?: boolean;
}

export interface MythXClipPrompt {
  act: 1 | 2 | 3;
  prompt: string;
  durationSeconds: number;
}

export interface MythXResult {
  prompts: MythXClipPrompt[];
  combo: MythXCombo;
  reply: string;
}

// ═══════════════════════════════════════════════════════════════════
// Sentiment Analysis via xAI
// ═══════════════════════════════════════════════════════════════════

async function analyzeSentiment(tweetsText: string): Promise<MythXSentiment> {
  try {
    const result = await generateTextInferenceJson<{
      flavor: MythXSentiment["flavor"];
      intensity: MythXSentiment["intensity"];
      overall: MythXSentiment["overall"];
    }>({
      messages: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON with keys: " +
            "'flavor' (heroic/chaotic/reflective/savage/triumphant/melancholic/furious/serene), " +
            "'intensity' (low/medium/high), " +
            "'overall' (positive/neutral/negative).",
        },
        {
          role: "user",
          content: `Analyze these tweets and return JSON:\n${tweetsText.slice(0, 2000)}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 80,
    });
    return result;
  } catch {
    return { flavor: "heroic", intensity: "medium", overall: "neutral" };
  }
}

// ═══════════════════════════════════════════════════════════════════
// Sentiment-biased combo sampling
// ═══════════════════════════════════════════════════════════════════

function sampleCombo(sentiment: MythXSentiment): MythXCombo {
  const { flavor } = sentiment;

  let theme: string;
  if (["heroic", "triumphant", "serene"].includes(flavor) && _POSITIVE_THEMES.length) {
    theme = _POSITIVE_THEMES[Math.floor(Math.random() * _POSITIVE_THEMES.length)];
  } else if (["savage", "furious", "chaotic"].includes(flavor) && _NEGATIVE_THEMES.length) {
    theme = _NEGATIVE_THEMES[Math.floor(Math.random() * _NEGATIVE_THEMES.length)];
  } else {
    theme = EPIC_THEMES[Math.floor(Math.random() * EPIC_THEMES.length)];
  }

  return {
    theme,
    arena: SUB_THEMES[Math.floor(Math.random() * SUB_THEMES.length)],
    subStyle: NINETIES_ANIME_SUBSTYLES[Math.floor(Math.random() * NINETIES_ANIME_SUBSTYLES.length)],
    tech: CINEMATIC_TECH[Math.floor(Math.random() * CINEMATIC_TECH.length)],
    sentiment,
    style: "holographic_crt",
  };
}

// ═══════════════════════════════════════════════════════════════════
// 3-Act Prompt Generation
// ═══════════════════════════════════════════════════════════════════

function buildActPrompt(input: {
  act: 1 | 2 | 3;
  username: string;
  combo: MythXCombo;
  isPremium: boolean;
  langInstruction: string;
}): MythXClipPrompt {
  const { act, username, combo, isPremium, langInstruction } = input;

  const actLabel = act === 1 ? "The Setup" : act === 2 ? "The Rising Action" : "The Climax and Resolution";
  const continuity = act > 1
    ? "Seamlessly continue directly from the exact last frame of the previous clip. " +
      "Maintain identical character appearance, lighting, color grading, scanlines, " +
      "phosphor glow, RGB fringing, curvature, and all analog CRT effects. "
    : "";

  const qualityBase =
    "Ultra detailed, 24fps smooth natural motion, accurate physics simulation, " +
    "cinematic masterpiece, maximum emotional impact, highly detailed keyframe animation";

  const premiumSuffix = isPremium ? `, ${PREMIUM_CREATIVE_DIRECTION}` : "";

  // Narrative context
  const narrative =
    `@${username} is the powerful hero in a ${combo.theme} ` +
    `set in the ${combo.arena}. ` +
    `Style: ${combo.subStyle} visual influences.`;

  // Act-specific content
  let actContent: string;
  if (act === 1) {
    actContent =
      `Introduce @${username}'s personality and the arena environment. ` +
      `Show the beginning of their heroic journey with curiosity and emotional foundation. ` +
      `First powerful interaction with arena forces begins.`;
  } else if (act === 2) {
    actContent =
      `Build tension and emotional depth. ` +
      `Show key moments from @${username}'s tweets as they battle and interact ` +
      `with arena forces. Escalation of conflict and emotional depth.`;
  } else {
    actContent =
      `Deliver a powerful, memorable ending. ` +
      `@${username} claims victory or achieves their destiny. ` +
      `Epic memorable ending with powerful emotional resonance.`;
  }

  const prompt =
    `10 second 1:1 square 720p video captured exactly as if a real 1990s consumer ` +
    `camcorder is filming a CRT television screen that is displaying a real physical ` +
    `world event in 90s anime style. ` +
    `Central subject is @${username}. ` +
    `This is Act ${act} — ${actLabel}. ` +
    continuity +
    actContent + " " +
    `${narrative} ` +
    `Camera and motion: ${combo.tech}. ` +
    `${CRT_PHYSICS_BLOCK}. ` +
    `${qualityBase}${premiumSuffix}.${langInstruction}`;

  return { act, prompt, durationSeconds: 10 };
}

// ═══════════════════════════════════════════════════════════════════
// Caveman Reply Generator
// ═══════════════════════════════════════════════════════════════════

export function generateCavemanReply(
  tweetsText: string,
  username: string,
  combo: MythXCombo,
): string {
  const snippet = tweetsText.slice(0, 130).replace(/\n/g, " ").trim() || "tweets";
  const { flavor } = combo.sentiment;

  const hooks = [
    `CAVEMAN READ @${username} TWEETS (${flavor}). SAW ${snippet}... UGH CHAOS BUT LEGENDARY CRT ANIME! 🔥`,
    `CAVEMAN MAKE @${username} INTO CRT 90s ANIME MYTH IN ${combo.arena}. TWEETS WILD. VIDEO SLAPS HARD! 💥`,
    `CAVEMAN SEE @${username} FIGHTING LIFE. TURNED INTO GLORIOUS CRT ANIME BATTLE. UGH POWERFUL MYTH! 🚀`,
    `CAVEMAN READ @${username} TWEETS. BUILT EPIC CRT 90s ANIME LEGEND. WATCH 30 SECOND NOSTALGIA NOW! ✨`,
  ];

  return hooks[Math.floor(Math.random() * hooks.length)];
}

// ═══════════════════════════════════════════════════════════════════
// Language instruction helper
// ═══════════════════════════════════════════════════════════════════

function getLanguageInstruction(language: string): string {
  switch (language) {
    case "japanese": return " All spoken dialogue and on-screen text must be in natural Japanese.";
    case "chinese": return " All spoken dialogue and on-screen text must be in natural Mandarin Chinese.";
    case "russian": return " All spoken dialogue and on-screen text must be in natural Russian.";
    default: return "";
  }
}

// ═══════════════════════════════════════════════════════════════════
// Main entry point — generates 3-act MythX video
// ═══════════════════════════════════════════════════════════════════

export async function generateMythXVideo(input: {
  tweetsText: string;
  username: string;
  language?: string;
  isPremium?: boolean;
}): Promise<MythXResult> {
  const { tweetsText, username, language = "english", isPremium = false } = input;

  // 1. Analyze sentiment from tweets
  const sentiment = await analyzeSentiment(tweetsText);

  // 2. Sample cinematic combo (biased by sentiment)
  const combo = sampleCombo(sentiment);

  // 3. Apply premium if mention tweet has >= 100 likes
  if (isPremium) {
    combo.premium = true;
  }

  // 4. Generate 3-act prompts (10s each = 30s total)
  const langInstruction = getLanguageInstruction(language);
  const prompts: MythXClipPrompt[] = [
    buildActPrompt({ act: 1, username, combo, isPremium, langInstruction }),
    buildActPrompt({ act: 2, username, combo, isPremium, langInstruction }),
    buildActPrompt({ act: 3, username, combo, isPremium, langInstruction }),
  ];

  // 5. Generate caveman reply for X bot
  const reply = generateCavemanReply(tweetsText, username, combo);

  return { prompts, combo, reply };
}
