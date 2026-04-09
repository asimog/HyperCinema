import {
  generateTextInference,
  generateTextInferenceJson,
} from "@/lib/inference/text";
import { logger } from "@/lib/logging/logger";
import type { AnalystReport } from "@/lib/agents/analyst";
import type { ScriptOutput } from "@/lib/agents/writer";

// ── Types ──────────────────────────────────────────────────

export interface VisualDirection {
  style: string;
  cameraAngles: string[];
  lighting: string;
  colorPalette: string[];
  aspectRatio: string;
  pacing: string;
  mood: string;
}

interface VisualSchema {
  style: string;
  cameraAngles: string[];
  lighting: string;
  colorPalette: string[];
  aspectRatio: string;
  pacing: string;
  mood: string;
}

// ── Constants ──────────────────────────────────────────────

const STYLE_LIBRARY: Record<string, { label: string; description: string }> = {
  trench_neon: {
    label: "Trench Neon",
    description:
      "Neon-lit cyberpunk aesthetic with rain-soaked streets and glowing signage",
  },
  cyberpunk_neon: {
    label: "Cyberpunk Neon",
    description:
      "High-tech low-life visuals with neon blues, pinks, and purples",
  },
  film_grain_70s: {
    label: "70s Film Grain",
    description:
      "Warm analog film look with visible grain and vintage color grading",
  },
  vhs_cinema: {
    label: "VHS Cinema",
    description: "Retro VHS tape aesthetic with tracking lines and color bleed",
  },
  black_and_white_noir: {
    label: "Black & White Noir",
    description:
      "High-contrast monochrome with deep shadows and dramatic lighting",
  },
  anime_cel: {
    label: "Anime Cel",
    description:
      "Traditional anime cel-shaded look with bold outlines and flat colors",
  },
  studio_ghibli_watercolor: {
    label: "Studio Ghibli Watercolor",
    description:
      "Soft watercolor backgrounds with hand-drawn character aesthetic",
  },
  vaporwave_mall: {
    label: "Vaporwave Mall",
    description:
      "Pastel neon, classical statues, and retro-futuristic architecture",
  },
  retrowave_sunset: {
    label: "Retrowave Sunset",
    description:
      "80s synthwave aesthetic with grid lines, sunsets, and neon gradients",
  },
  wes_anderson_pastel: {
    label: "Wes Anderson Pastel",
    description:
      "Symmetrical compositions with pastel color palettes and meticulous framing",
  },
  wong_kar_wai_neon: {
    label: "Wong Kar-Wai Neon",
    description: "Moody neon-lit scenes with motion blur and saturated colors",
  },
  space_odyssey: {
    label: "Space Odyssey",
    description:
      "Epic sci-fi visuals with vast cosmic landscapes and minimalist compositions",
  },
  glitch_digital: {
    label: "Glitch Digital",
    description:
      "Digital corruption aesthetic with datamoshing and pixel sorting effects",
  },
  double_exposure: {
    label: "Double Exposure",
    description: "Layered imagery creating surreal composite images",
  },
  hyperflow_assembly: {
    label: "Hyperflow Assembly",
    description:
      "Dynamic montage with rapid cuts and high-energy visual transitions",
  },
};

const DIRECTOR_SYSTEM_PROMPT = `You are an elite film director AI for HyperCinema, an AI-powered video generation platform.
Your job is to plan the visual style, camera angles, lighting, and scene composition for cinematic videos.

Guidelines:
- Choose camera angles that enhance the emotional impact of each scene
- Lighting should match the mood (e.g., high-key for upbeat, low-key for dramatic)
- Color palettes should be specific (3-5 colors with descriptive names)
- Pacing should reflect the content energy (slow-burn, moderate, fast-paced, frenetic)
- Be specific and actionable — these directions go to AI video generators`;

const STYLE_SELECTION_PROMPT = `You are a film style consultant for HyperCinema.
Your job is to select the most appropriate visual style based on the content analysis.

Match the style to the mood, themes, and subject matter. Consider:
- Crypto/trading content -> cyberpunk, neon, trench aesthetics
- Personal/emotional content -> warm, intimate, film-grain looks
- Epic/ambitious content -> widescreen cinematic, space odyssey
- Meme/community content -> vaporwave, anime, playful styles
- Dark/intense content -> noir, glitch, dramatic lighting`;

// ── Director Functions ─────────────────────────────────────

/**
 * Creates a visual direction plan from a script and aspect ratio.
 */
export async function directVisuals(
  script: ScriptOutput,
  aspectRatio: "16:9" | "1:1" | "9:16" = "1:1",
): Promise<VisualDirection> {
  logger.info("director_planning_visuals", {
    component: "agents_director",
    stage: "directVisuals",
    aspectRatio,
    scriptMood: script.mood,
    sceneCount: script.scenes.length,
  });

  const aspectRatioLabels: Record<string, string> = {
    "1:1": "Square format (1:1)",
    "9:16": "Vertical TikTok/Reels (9:16)",
    "16:9": "Widescreen cinematic (16:9)",
  };

  const userPrompt = `Create a visual direction plan for this cinematic script.

Script:
- Mood: ${script.mood}
- Style: ${script.style}
- Visual Prompt: ${script.visualPrompt}
- Scenes: ${script.scenes.length}
- Aspect Ratio: ${aspectRatioLabels[aspectRatio] ?? aspectRatio}

Scene Breakdown:
${script.scenes.map((s, i) => `${i + 1}. Narration: "${s.narration.slice(0, 80)}..." | Visual: "${s.visualPrompt.slice(0, 100)}..."`).join("\n")}

Return your visual direction in this exact JSON format:
{
  "style": "A specific visual style label that fits the content",
  "cameraAngles": ["wide establishing shot", "medium close-up", "extreme close-up"],
  "lighting": "Specific lighting setup (e.g., low-key with neon rim lights)",
  "colorPalette": ["deep navy", "neon cyan", "warm amber"],
  "aspectRatio": "${aspectRatio}",
  "pacing": "slow-burn | moderate | fast-paced | frenetic",
  "mood": "${script.mood}"
}`;

  try {
    const result = await generateTextInferenceJson<VisualSchema>({
      messages: [
        { role: "system", content: DIRECTOR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      maxTokens: 600,
    });

    const direction: VisualDirection = {
      style: result.style ?? "cinematic",
      cameraAngles:
        Array.isArray(result.cameraAngles) && result.cameraAngles.length > 0
          ? result.cameraAngles
          : ["medium shot", "close-up", "wide shot"],
      lighting: result.lighting ?? "Cinematic lighting with contrast and depth",
      colorPalette:
        Array.isArray(result.colorPalette) && result.colorPalette.length > 0
          ? result.colorPalette
          : ["deep blue", "warm gold", "neutral gray"],
      aspectRatio: result.aspectRatio ?? aspectRatio,
      pacing: result.pacing ?? "moderate",
      mood: result.mood ?? script.mood,
    };

    logger.info("director_visual_plan_created", {
      component: "agents_director",
      stage: "directVisuals",
      style: direction.style,
      pacing: direction.pacing,
      colorCount: direction.colorPalette.length,
    });

    return direction;
  } catch (error) {
    logger.warn("director_visual_planning_failed", {
      component: "agents_director",
      stage: "directVisuals",
      errorCode: "visual_planning_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return buildFallbackVisualDirection(script, aspectRatio);
  }
}

/**
 * Selects an appropriate video style based on the analyst report content.
 */
export async function chooseStyle(report: AnalystReport): Promise<string> {
  logger.info("director_choosing_style", {
    component: "agents_director",
    stage: "chooseStyle",
    reportType: report.type,
    mood: report.mood,
    themes: report.keyThemes,
  });

  const availableStyles = Object.entries(STYLE_LIBRARY)
    .map(([id, info]) => `${id}: ${info.description}`)
    .join("\n");

  const userPrompt = `Select the most appropriate visual style for this content.

Content Analysis:
- Type: ${report.type}
- Summary: ${report.summary}
- Key Themes: ${report.keyThemes.join(", ")}
- Entities: ${report.entities.join(", ")}
- Mood: ${report.mood}

Available Styles:
${availableStyles}

Respond with ONLY the style ID (e.g., "trench_neon") that best matches this content. Consider the mood, themes, and subject matter.`;

  try {
    const content = await generateTextInference({
      messages: [
        { role: "system", content: STYLE_SELECTION_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 50,
    });

    const selected = content.trim().toLowerCase().replace(/["']/g, "");

    // Validate against known styles
    if (STYLE_LIBRARY[selected]) {
      logger.info("director_style_selected", {
        component: "agents_director",
        stage: "chooseStyle",
        style: selected,
      });
      return selected;
    }

    // Fallback to best match based on mood
    return matchStyleByMood(report.mood);
  } catch (error) {
    logger.warn("director_style_selection_failed", {
      component: "agents_director",
      stage: "chooseStyle",
      errorCode: "style_selection_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return matchStyleByMood(report.mood);
  }
}

// ── Helpers ────────────────────────────────────────────────

function matchStyleByMood(mood: string): string {
  const moodLower = mood.toLowerCase();

  if (
    moodLower.includes("cyber") ||
    moodLower.includes("neon") ||
    moodLower.includes("tech")
  ) {
    return "cyberpunk_neon";
  }
  if (
    moodLower.includes("dark") ||
    moodLower.includes("noir") ||
    moodLower.includes("mysterious")
  ) {
    return "black_and_white_noir";
  }
  if (
    moodLower.includes("warm") ||
    moodLower.includes("nostalg") ||
    moodLower.includes("retro")
  ) {
    return "film_grain_70s";
  }
  if (
    moodLower.includes("anime") ||
    moodLower.includes("cartoon") ||
    moodLower.includes("playful")
  ) {
    return "anime_cel";
  }
  if (
    moodLower.includes("dream") ||
    moodLower.includes("soft") ||
    moodLower.includes("gentle")
  ) {
    return "studio_ghibli_watercolor";
  }
  if (
    moodLower.includes("epic") ||
    moodLower.includes("grand") ||
    moodLower.includes("cosmic")
  ) {
    return "space_odyssey";
  }
  if (
    moodLower.includes("glitch") ||
    moodLower.includes("digital") ||
    moodLower.includes("chaos")
  ) {
    return "glitch_digital";
  }
  if (
    moodLower.includes("80s") ||
    moodLower.includes("retro") ||
    moodLower.includes("synth")
  ) {
    return "retrowave_sunset";
  }
  if (
    moodLower.includes("symmetric") ||
    moodLower.includes("pastel") ||
    moodLower.includes("quirky")
  ) {
    return "wes_anderson_pastel";
  }

  // Default
  return "trench_neon";
}

function buildFallbackVisualDirection(
  script: ScriptOutput,
  aspectRatio: string,
): VisualDirection {
  return {
    style: "cinematic",
    cameraAngles: [
      "medium establishing shot",
      "close-up for emotional moments",
      "wide closing shot",
    ],
    lighting:
      "Cinematic three-point lighting with atmospheric haze and subtle rim light",
    colorPalette: ["deep navy", "warm amber", "soft white"],
    aspectRatio,
    pacing: "moderate",
    mood: script.mood,
  };
}
