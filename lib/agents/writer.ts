import { generateTextInference, generateTextInferenceJson } from "@/lib/inference/text";
import { logger } from "@/lib/logging/logger";
import type { AnalystReport } from "@/lib/agents/analyst";

// ── Types ──────────────────────────────────────────────────

export interface SceneScript {
  narration: string;
  visualPrompt: string;
  durationSeconds: number;
}

export interface ScriptOutput {
  narration: string;
  visualPrompt: string;
  scenes: SceneScript[];
  mood: string;
  style: string;
}

interface ScriptSchema {
  hookLine: string;
  narration: string;
  visualPrompt: string;
  mood: string;
  style: string;
  scenes: Array<{
    narration: string;
    visualPrompt: string;
    durationSeconds: number;
  }>;
}

// ── Constants ──────────────────────────────────────────────

const WRITER_SYSTEM_PROMPT = `You are an elite cinematic scriptwriter for HyperCinema, an AI-powered video generation platform.
Your job is to transform analytical reports into compelling cinematic scripts with narration and visual descriptions.

Guidelines:
- Write a strong hook that grabs attention in the first 3 seconds
- Create vivid, specific visual prompts that work well for AI video generation
- Keep narration concise and punchy — every word should earn its place
- Match the tone and mood to the source material
- Structure scenes with clear emotional progression (hook -> build -> payoff)
- Visual prompts should be detailed: camera angle, lighting, subject, movement, atmosphere
- Each scene should be 3-8 seconds depending on content complexity`;

const NARRATION_SYSTEM_PROMPT = `You are a hook-writing specialist for HyperCinema.
Your job is to craft a single compelling narration line that grabs attention immediately.

Guidelines:
- Maximum 200 characters
- Must create curiosity or emotional impact
- Should feel like the opening of a movie trailer
- Match the mood and themes from the analyst report`;

// ── Writer Functions ───────────────────────────────────────

/**
 * Generates a full cinematic script with narration and visual prompts from an analyst report.
 */
export async function writeScript(
  report: AnalystReport,
  style?: string,
): Promise<ScriptOutput> {
  logger.info("writer_generating_script", {
    component: "agents_writer",
    stage: "writeScript",
    reportType: report.type,
    mood: report.mood,
    style: style ?? "auto",
  });

  const styleDirective = style ? `Apply this specific style: ${style}.` : "Choose a cinematic style that fits the content.";

  const userPrompt = `Transform this analyst report into a cinematic script.

Analyst Report:
- Type: ${report.type}
- Summary: ${report.summary}
- Key Themes: ${report.keyThemes.join(", ")}
- Entities: ${report.entities.join(", ")}
- Mood: ${report.mood}

Source Data:
${report.sourceData}

Directives:
${styleDirective}
- Create 3-6 scenes with clear emotional progression
- Each scene needs narration AND a visual prompt
- Visual prompts must be detailed enough for AI video generation (specify camera angle, lighting, subject, movement, atmosphere)
- Total narration should be 150-400 words
- Hook line must be under 120 characters

Return your script in this exact JSON format:
{
  "hookLine": "A punchy opening line under 120 chars",
  "narration": "Full narration text (can combine all scenes)",
  "visualPrompt": "Overall visual style description",
  "mood": "The emotional tone",
  "style": "The chosen visual style label",
  "scenes": [
    {
      "narration": "Scene narration text (min 10 chars)",
      "visualPrompt": "Detailed visual description for AI video gen (min 20 chars)",
      "durationSeconds": 4
    }
  ]
}`;

  try {
    const result = await generateTextInferenceJson<ScriptSchema>({
      messages: [
        { role: "system", content: WRITER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.82,
      maxTokens: 1600,
    });

    // Validate scene narrations meet minimum length
    const validatedScenes = result.scenes.map((scene) => ({
      ...scene,
      narration: scene.narration.length >= 10
        ? scene.narration
        : `${scene.narration}...`,
      visualPrompt: scene.visualPrompt.length >= 20
        ? scene.visualPrompt
        : `${scene.visualPrompt}. A compelling visual scene with clear composition and atmosphere.`,
      durationSeconds: Math.max(2, Math.min(12, scene.durationSeconds)),
    }));

    // Ensure at least 3 scenes
    if (validatedScenes.length < 3) {
      const baseDuration = Math.max(3, Math.floor(15 / 3));
      while (validatedScenes.length < 3) {
        validatedScenes.push({
          narration: "The story continues with building tension and emotional depth.",
          visualPrompt: "A cinematic scene with atmospheric lighting and dynamic composition, carrying the emotional thread forward.",
          durationSeconds: baseDuration,
        });
      }
    }

    const output: ScriptOutput = {
      narration: result.narration,
      visualPrompt: result.visualPrompt,
      scenes: validatedScenes,
      mood: result.mood ?? report.mood,
      style: result.style ?? "cinematic",
    };

    logger.info("writer_script_generated", {
      component: "agents_writer",
      stage: "writeScript",
      sceneCount: output.scenes.length,
      totalDuration: output.scenes.reduce((sum, s) => sum + s.durationSeconds, 0),
    });

    return output;
  } catch (error) {
    logger.warn("writer_script_generation_failed", {
      component: "agents_writer",
      stage: "writeScript",
      errorCode: "script_generation_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return buildFallbackScript(report, style);
  }
}

/**
 * Generates just the narration hook from an analyst report.
 */
export async function writeNarration(report: AnalystReport): Promise<string> {
  logger.info("writer_generating_narration", {
    component: "agents_writer",
    stage: "writeNarration",
    reportType: report.type,
  });

  const userPrompt = `Write a single compelling narration hook based on this analyst report.

Report:
- Summary: ${report.summary}
- Key Themes: ${report.keyThemes.join(", ")}
- Mood: ${report.mood}

Write one powerful opening line (max 200 characters) that grabs attention like a movie trailer hook.`;

  try {
    const content = await generateTextInference({
      messages: [
        { role: "system", content: NARRATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      maxTokens: 100,
    });

    const hook = content.trim().slice(0, 200);
    return hook.length >= 10 ? hook : `${report.summary.slice(0, 150)}...`;
  } catch (error) {
    logger.warn("writer_narration_failed", {
      component: "agents_writer",
      stage: "writeNarration",
      errorCode: "narration_failed",
    });

    return `${report.summary.slice(0, 150)}`;
  }
}

/**
 * Adapts a script for different aspect ratios by adjusting visual prompts.
 */
export function adaptForFormat(
  script: ScriptOutput,
  format: "16:9" | "1:1" | "9:16",
): ScriptOutput {
  const formatDirectives: Record<string, { label: string; modifier: string }> = {
    "16:9": {
      label: "Widescreen 16:9",
      modifier: "Wide cinematic composition, horizontal framing, expansive background and negative space on the sides.",
    },
    "1:1": {
      label: "Square 1:1",
      modifier: "Square composition, centered subject, balanced framing with equal negative space on all sides.",
    },
    "9:16": {
      label: "Vertical 9:16",
      modifier: "Vertical/portrait framing, tight on subject, stacked composition with foreground and background layers.",
    },
  };

  const directive = formatDirectives[format];
  if (!directive) {
    return script;
  }

  return {
    ...script,
    visualPrompt: `${script.visualPrompt} ${directive.modifier}`,
    scenes: script.scenes.map((scene) => ({
      ...scene,
      visualPrompt: `${scene.visualPrompt} ${directive.modifier}`,
    })),
    style: `${script.style}_${format.replace(":", "_")}`,
  };
}

// ── Fallback ───────────────────────────────────────────────

function buildFallbackScript(
  report: AnalystReport,
  style?: string,
): ScriptOutput {
  const themes = report.keyThemes.length > 0 ? report.keyThemes.join(", ") : "compelling narrative";
  const mood = report.mood || "cinematic";

  return {
    narration: `${report.summary}`,
    visualPrompt: `A cinematic scene about ${themes}, rendered in a ${mood} style with atmospheric lighting and dynamic composition.`,
    scenes: [
      {
        narration: `The story opens with a compelling hook about ${themes}.`,
        visualPrompt: "Opening shot with atmospheric lighting, establishing the scene with a clear emotional tone. Cinematic wide framing.",
        durationSeconds: 4,
      },
      {
        narration: `Tension builds as the narrative deepens, exploring ${report.entities.slice(0, 2).join(" and ") || "the core themes"}.`,
        visualPrompt: "Medium shot with dynamic camera movement, rich color palette with contrast between light and shadow.",
        durationSeconds: 5,
      },
      {
        narration: `The climax delivers an emotional payoff that resonates with the ${mood} tone established from the beginning.`,
        visualPrompt: "Close-up or medium close-up with dramatic lighting, the emotional peak of the scene captured in a single powerful frame.",
        durationSeconds: 4,
      },
    ],
    mood,
    style: style ?? "cinematic",
  };
}
