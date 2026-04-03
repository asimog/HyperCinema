import { z } from "zod";

import { DEFAULT_HYPERM_STYLE_ID } from "@/lib/hyperm/styles";
import { TOKEN_VIDEO_STYLE_PRESETS } from "@/lib/memecoins/styles";
import type { CinemaExperience, VideoStyleId } from "@/lib/types/domain";

const VIDEO_STYLE_ID_SET = new Set<string>([
  ...TOKEN_VIDEO_STYLE_PRESETS.map((preset) => preset.id),
  "crt_anime_90s",
]);

export function isVideoStyleId(value: unknown): value is VideoStyleId {
  return typeof value === "string" && VIDEO_STYLE_ID_SET.has(value);
}

export const videoStyleSchema = z.custom<VideoStyleId>(isVideoStyleId, {
  message: "Invalid style preset",
});

export function getDefaultStylePresetForExperience(
  experience?: CinemaExperience | null,
): VideoStyleId {
  switch (experience) {
    case "hyperm":
      return DEFAULT_HYPERM_STYLE_ID;
    case "trenchcinema":
    case "hashmyth":
      return "trench_neon";
    case "funcinema":
    case "musicvideo":
      return "glass_signal";
    case "familycinema":
    case "lovex":
      return "mythic_poster";
    case "mythx":
    case "hypercinema":
    case "recreator":
    default:
      return "hyperflow_assembly";
  }
}
