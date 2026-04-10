// ── Video Render Pipeline ──────────────────────────────────────────
// Orchestrates the full script → video flow:
// 1. generateCinematicScript() — AI generates scene plan + narration
// 2. buildXAiVideoRenderPayload() — builds xAI 720p 1:1 render payload
// 3. renderCinematicVideo() — sends to video-service, polls until done
// Returns: script, video URL, thumbnail URL

import { generateCinematicScript } from "@/lib/ai/cinematic";
import { getEnv } from "@/lib/env";
import { renderCinematicVideo } from "@/lib/video/client";
import { buildXAiVideoRenderPayload } from "@/lib/video/xai";
import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";

// Generate cinematic script, render via xAI, return URLs
export async function buildAndRenderVideo(input: {
  jobId: string;
  walletStory: WalletStory;
}): Promise<{
  script: GeneratedCinematicScript;
  videoUrl: string;
  thumbnailUrl: string | null;
}> {
  // AI generates scene plan and narration
  const script = await generateCinematicScript(input.walletStory);
  const env = getEnv();

  // Build xAI-specific render payload — 720p, 1:1 square
  const xaiPayload = buildXAiVideoRenderPayload({
    walletStory: input.walletStory,
    script,
    model: env.XAI_VIDEO_MODEL,
    resolution: "720p",
    aspectRatio: "1:1",
  });

  // Send to video service, poll until done
  const rendered = await renderCinematicVideo({
    jobId: input.jobId,
    wallet: input.walletStory.wallet,
    durationSeconds: input.walletStory.durationSeconds,
    script,
    xai: xaiPayload,
  });

  return {
    script,
    videoUrl: rendered.videoUrl,
    thumbnailUrl: rendered.thumbnailUrl,
  };
}
