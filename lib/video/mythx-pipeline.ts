// MythX video pipeline — integrates 90s Anime CRT engine with video rendering
// Takes 3-act MythX prompts → generates scenes → renders via xAI → stitches into 30s video

import { generateTextInferenceJson, generateTextInference } from "@/lib/inference/text";
import { getEnv } from "@/lib/env";
import { renderCinematicVideo } from "@/lib/video/client";
import { buildXAiVideoRenderPayload } from "@/lib/video/xai";
import { generateMythXVideo, type MythXResult, type MythXClipPrompt } from "@/workers/mythx-engine";
import { GeneratedCinematicScript, WalletStory } from "@/lib/types/domain";
import { logger } from "@/lib/logging/logger";

// Build a WalletStory from X profile data for MythX
function buildMythXWalletStory(input: {
  username: string;
  tweetsText: string;
  displayName: string;
  profileUrl: string;
  transcript: string | null;
  durationSeconds: number;
}): WalletStory {
  return {
    wallet: input.username,
    storyKind: "mythx",
    subjectName: input.displayName || `@${input.username}`,
    subjectDescription: `Autobiography from @${input.username}'s tweets`,
    sourceMediaUrl: input.profileUrl,
    sourceMediaProvider: "x",
    sourceTranscript: input.transcript,
    audioEnabled: false,
    rangeDays: 1,
    packageType: "30s",
    durationSeconds: input.durationSeconds,
    analytics: {
      styleClassification: "crt_anime_90s",
      personality: "heroic",
      trades: [],
      sessions: [],
      pnl: { totalSol: 0, bestTrade: null, worstTrade: null },
    },
  };
}

// Build cinematic script from MythX 3-act prompts
function buildMythXCinematicScript(prompts: MythXClipPrompt[], story: WalletStory): GeneratedCinematicScript {
  return {
    hookLine: `@${story.subjectName} — a 90s anime CRT legend`,
    scenes: prompts.map((clip, i) => ({
      sceneNumber: i + 1,
      visualPrompt: clip.prompt,
      narration: `${story.subjectName} Act ${clip.act}: ${clip.prompt.slice(0, 200)}...`,
      durationSeconds: clip.durationSeconds,
      imageUrl: null,
    })),
  };
}

// Main: generate MythX video from X profile
export async function generateMythXVideo(input: {
  jobId: string;
  username: string;
  tweetsText: string;
  displayName: string;
  profileUrl: string;
  transcript: string | null;
  language?: string;
  isPremium?: boolean;
}): Promise<{
  mythxResult: MythXResult;
  videoUrl: string;
  thumbnailUrl: string | null;
  script: GeneratedCinematicScript;
}> {
  const { jobId, username, tweetsText, displayName, profileUrl, transcript, language, isPremium } = input;

  // 1. Generate MythX 3-act prompts with CRT physics
  const mythxResult = await generateMythXVideo({
    tweetsText,
    username,
    language,
    isPremium,
  });

  logger.info("mythx_prompts_generated", {
    component: "mythx_engine",
    username,
    jobId,
    acts: mythxResult.prompts.length,
    combo: mythxResult.combo,
  });

  // 2. Build WalletStory for pipeline
  const story = buildMythXWalletStory({
    username,
    tweetsText,
    displayName,
    profileUrl,
    transcript,
    durationSeconds: 30, // 3 acts × 10s
  });

  // 3. Build cinematic script from MythX prompts
  const script = buildMythXCinematicScript(mythxResult.prompts, story);

  // 4. Build xAI render payload — 720p, 1:1 square
  const env = getEnv();
  const xaiPayload = buildXAiVideoRenderPayload({
    walletStory: story,
    script,
    model: env.XAI_VIDEO_MODEL,
    resolution: "720p",
    aspectRatio: "1:1",
  });

  // 5. Render video via video-service
  const rendered = await renderCinematicVideo({
    jobId,
    wallet: username,
    durationSeconds: 30,
    script,
    xai: xaiPayload,
  });

  logger.info("mythx_video_rendered", {
    component: "mythx_engine",
    username,
    jobId,
    videoUrl: rendered.videoUrl,
  });

  return {
    mythxResult,
    videoUrl: rendered.videoUrl,
    thumbnailUrl: rendered.thumbnailUrl,
    script,
  };
}
