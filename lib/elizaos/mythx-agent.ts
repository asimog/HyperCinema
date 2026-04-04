// MythXEliza agent - video generation pipeline
// Scrapes tweets, synthesizes narrative, generates video

import { getElizaOSClient } from "./client";
import { MYTHX_ELIZA_CHARACTER, MYTHX_ELIZA_AGENT_ID } from "./mythx-character";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { getXClient, XClient, XCommandParseResult } from "@/lib/x/client";
import { validatePromoCode, usePromoCode } from "@/lib/promocodes/manager";
import { randomUUID } from "crypto";

// X profile data for video generation
export interface MythXElizaProfile {
  displayName: string;
  username: string;
  profileUrl: string;
  description: string | null;
  profileImageUrl: string | null;
}

// Individual tweet from profile
export interface MythXElizaTweet {
  id: string;
  text: string;
  createdAt: string | null;
}

export interface MythXElizaRequest {
  profileInput: string;
  style?: string;
  maxTweets?: number;
  promoCode?: string | null;
  jobId?: string;
  wallet?: string;
  triggerFromTwitter?: boolean;
  replyToTweetId?: string;
}

export interface MythXElizaResponse {
  jobId: string;
  profile: MythXElizaProfile;
  tweets: MythXElizaTweet[];
  transcript: string;
  narrative: string;
  scenes: MythXElizaScene[];
  videoUrl: string | null;
  firebaseStorageUrl: string | null;
  galleryUrl: string;
  postedToTwitter: boolean;
  twitterPostUrl: string | null;
  promoCodeUsed: string | null;
  metadata: {
    style: string;
    totalScenes: number;
    totalDurationSeconds: number;
    processingTimeMs: number;
  };
}

export interface MythXElizaScene {
  sceneNumber: number;
  visualPrompt: string;
  narration?: string;
  style: string;
  durationSeconds: number;
}

// Status update callback type
export type StatusCallback = (status: string, progress?: number) => Promise<void>;

/**
 * STEP 1: Scrape 42 tweets from X profile
 */
async function scrapeTweets(
  profileInput: string,
  maxTweets: number,
  onStatus?: StatusCallback
): Promise<{
  profile: MythXElizaProfile;
  tweets: MythXElizaTweet[];
  transcript: string;
}> {
  await onStatus?.("📊 Scraping tweets from profile...", 10);

  const env = getEnv();
  const useDirectXAPI = env.X_API_CONSUMER_KEY && env.X_API_ACCESS_TOKEN;

  if (useDirectXAPI) {
    // Use existing X API implementation
    const { fetchXProfileTweets } = await import("@/lib/x/api");
    const result = await fetchXProfileTweets({ profileInput, maxTweets });

    await onStatus?.(`✅ Scraped ${result.tweets.length} tweets`, 20);

    return {
      profile: {
        displayName: result.profile.displayName,
        username: result.profile.username,
        profileUrl: result.profile.profileUrl,
        description: result.profile.description,
        profileImageUrl: result.profile.profileImageUrl,
      },
      tweets: result.tweets,
      transcript: result.transcript,
    };
  }

  // Fallback: Try ElizaOS knowledge base
  const client = getElizaOSClient();
  const response = await client.chatCompletion({
    agentId: MYTHX_ELIZA_AGENT_ID,
    messages: [
      {
        role: "system",
        content: `You are a tweet scraper. Fetch the last ${maxTweets} tweets from: ${profileInput}
Return ONLY JSON: {"profile":{"displayName":"","username":"","profileUrl":"","description":"","profileImageUrl":""},"tweets":[{"id":"","text":"","createdAt":""}],"transcript":""}`,
      },
      {
        role: "user",
        content: `Scrape tweets from ${profileInput}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 8000,
  });

  const content = response.choices[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error("Failed to parse tweet data from ElizaOS");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  await onStatus?.(`✅ Scraped ${parsed.tweets?.length || 0} tweets`, 20);

  return {
    profile: parsed.profile,
    tweets: parsed.tweets || [],
    transcript: parsed.transcript || "",
  };
}

/**
 * STEP 2: Narrator synthesizes tweets into cinematic prompt
 */
async function synthesizeNarrative(
  profile: MythXElizaProfile,
  tweets: MythXElizaTweet[],
  transcript: string,
  style: string,
  onStatus?: StatusCallback
): Promise<{
  narrative: string;
  scenes: MythXElizaScene[];
}> {
  await onStatus?.("✍️ Narrator synthesizing cinematic narrative...", 30);

  const client = getElizaOSClient();

  const styleHints: Record<string, string> = {
    hyperflow_assembly: "Fluid, interconnected visual flow with seamless transitions",
    vhs_cinema: "VHS aesthetic, analog warmth, retro video feel",
    black_and_white_noir: "Black and white, high contrast, film noir lighting",
    double_exposure: "Layered imagery, multiple exposures, dreamlike overlays",
    glitch_digital: "Digital glitches, data moshing, cyberpunk aesthetics",
    found_footage_raw: "Raw, documentary-style, found footage aesthetic",
    split_screen_diptych: "Split screen compositions, parallel narratives",
    film_grain_70s: "1970s film stock, warm grain, vintage cinema look",
  };

  const styleDescription = styleHints[style] || styleHints.vhs_cinema;

  const response = await client.chatCompletion({
    agentId: MYTHX_ELIZA_AGENT_ID,
    messages: [
      {
        role: "system",
        content: `You are the NARRATOR - a masterful cinematic storyteller.
          
TASK: Transform these tweets into an autobiographical video with 4-6 scenes.

PROFILE: ${profile.displayName} (@${profile.username})
${profile.description ? `BIO: ${profile.description}` : ""}

STYLE: ${styleDescription}

OUTPUT FORMAT (JSON only):
{
  "narrative": "Overall story arc (2-3 sentences)",
  "scenes": [
    {
      "sceneNumber": 1,
      "visualPrompt": "DETAILED visual description for video generation (50-100 words)",
      "narration": "Optional voiceover from tweets",
      "durationSeconds": 8
    }
  ]
}

RULES:
- Each visualPrompt must be detailed enough for AI video generation
- Include mood, lighting, camera movement, subject positioning
- Make it deeply personal - this is THEIR autobiography
- Use cinematic language: close-ups, wide shots, tracking, etc.`,
      },
      {
        role: "user",
        content: `Tweets from @${profile.username}:
${transcript}`,
      },
    ],
    temperature: 0.85,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Narrator failed to return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const scenes: MythXElizaScene[] = (parsed.scenes || []).map((scene: any) => ({
    sceneNumber: scene.sceneNumber || 1,
    visualPrompt: scene.visualPrompt || "",
    narration: scene.narration || undefined,
    style,
    durationSeconds: Math.max(5, Math.min(10, scene.durationSeconds || 8)),
  }));

  await onStatus?.(`🎬 Narrative complete: ${scenes.length} scenes planned`, 40);

  return {
    narrative: parsed.narrative || "",
    scenes,
  };
}

/**
 * STEP 3: Generate video via ElizaOS
 */
async function generateVideoViaElizaOS(
  scenes: MythXElizaScene[],
  agentId: string,
  onStatus?: StatusCallback
): Promise<string[]> {
  await onStatus?.("🎥 Generating video clips via ElizaOS...", 50);

  const client = getElizaOSClient();
  const videoUrls: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const progress = 50 + (i / scenes.length) * 40;
    await onStatus?.(`🎬 Generating scene ${scene.sceneNumber}/${scenes.length}...`, Math.round(progress));

    try {
      const videoResponse = await client.generateVideo({
        prompt: scene.visualPrompt,
        duration: scene.durationSeconds,
        aspectRatio: "16:9",
        style: scene.style,
        agentId,
      });

      if (videoResponse.id) {
        // Poll for completion
        let attempts = 0;
        const maxAttempts = 30;
        const pollInterval = 10000;

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          attempts++;

          const status = await client.getVideoStatus(videoResponse.id);

          if (status.status === "completed" && status.videoUrl) {
            videoUrls.push(status.videoUrl);
            break;
          }

          if (status.status === "failed") {
            console.error(`[MythXEliza] Scene ${scene.sceneNumber} failed`);
            break;
          }
        }
      }
    } catch (error) {
      console.error(`[MythXEliza] Error generating scene ${scene.sceneNumber}:`, error);
    }
  }

  await onStatus?.(`✅ Generated ${videoUrls.length} video clips`, 90);

  return videoUrls;
}

/**
 * STEP 4: Upload to Firebase & save for Gallery
 */
async function uploadToFirebaseAndSave(
  jobId: string,
  videoUrls: string[],
  scenes: MythXElizaScene[],
  profile: MythXElizaProfile,
  style: string
): Promise<{
  firebaseStorageUrl: string | null;
  galleryUrl: string;
}> {
  const primaryVideoUrl = videoUrls[0] || null;
  const galleryUrl = `${getEnv().APP_BASE_URL}/job/${jobId}`;

  // TODO: Implement Firebase upload when video URLs are ready
  // For now, use the ElizaOS video URL directly
  // In production, you'd download and re-upload to Firebase Storage

  // Save video metadata to Firestore
  try {
    const { getDb } = await import("@/lib/firebase/admin");
    const db = getDb();
    const { Timestamp } = await import("firebase-admin/firestore");

    // Save video document
    await db.collection("videos").doc(jobId).set({
      jobId,
      videoUrl: primaryVideoUrl,
      thumbnailUrl: profile.profileImageUrl,
      duration: scenes.reduce((sum, s) => sum + s.durationSeconds, 0),
      renderStatus: "ready",
      profile: {
        username: profile.username,
        displayName: profile.displayName,
        profileUrl: profile.profileUrl,
      },
      style,
      scenes: scenes.length,
      createdAt: Timestamp.now(),
      source: "mythx-eliza",
    });

    // Update job document
    await db.collection("jobs").doc(jobId).update({
      status: "complete",
      sourceMediaUrl: profile.profileUrl,
      subjectName: profile.displayName,
      videoStyle: style,
      completedAt: Timestamp.now(),
    });
  } catch (error) {
    console.warn("[MythXEliza] Failed to save to Firebase:", error);
  }

  return {
    firebaseStorageUrl: primaryVideoUrl,
    galleryUrl,
  };
}

/**
 * STEP 5: Post to X (Twitter)
 */
async function postToTwitter(
  profile: MythXElizaProfile,
  style: string,
  galleryUrl: string,
  replyToTweetId?: string
): Promise<{
  posted: boolean;
  postUrl: string | null;
  reason?: string;
}> {
  try {
    const xClient = getXClient();

    // Check if OAuth 1.0a credentials are available for posting
    if (!xClient.canPost()) {
      logger.warn("mythx_twitter_posting_not_configured", {
        component: "mythx_eliza",
        profile: profile.username,
      });
      return {
        posted: false,
        postUrl: null,
        reason: "X_API_OAUTH_NOT_CONFIGURED",
      };
    }

    const postText = XClient.buildVideoPostText({
      profileUsername: profile.username,
      profileDisplayName: profile.displayName,
      style,
      videoUrl: galleryUrl,
      galleryUrl,
    });

    let result;
    if (replyToTweetId) {
      result = await xClient.replyToTweet({
        tweetId: replyToTweetId,
        text: postText,
      });
    } else {
      result = await xClient.postTweet(postText);
    }

    return {
      posted: true,
      postUrl: result.url,
    };
  } catch (error) {
    logger.error("mythx_twitter_post_failed", {
      component: "mythx_eliza",
      errorCode: "twitter_post_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      posted: false,
      postUrl: null,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * MAIN ORCHESTRATOR: Full pipeline
 */
export async function generateMythXElizaVideo(
  request: MythXElizaRequest,
  onStatus?: StatusCallback
): Promise<MythXElizaResponse> {
  const startTime = Date.now();
  const jobId = request.jobId || `mythx-eliza-${randomUUID()}`;

  await onStatus?.(`🎬 MythXEliza starting: ${request.profileInput}`, 0);

  // Validate promo code if provided
  let promoCodeUsed: string | null = null;
  if (request.promoCode) {
    const validation = await validatePromoCode(request.promoCode);
    if (validation.isValid) {
      promoCodeUsed = validation.code;
      await onStatus?.(`🎟️ Promo code ${validation.code} validated`, 5);
    } else {
      console.warn(`[MythXEliza] Invalid promo code: ${request.promoCode}`);
    }
  }

  // Initialize ElizaOS agent
  try {
    const client = getElizaOSClient();
    await client.createOrUpdateAgent({
      agentId: MYTHX_ELIZA_AGENT_ID,
      name: MYTHX_ELIZA_CHARACTER.name,
      character: MYTHX_ELIZA_CHARACTER as unknown as Record<string, unknown>,
    });
  } catch (error) {
    console.warn("[MythXEliza] Agent update skipped:", error);
  }

  // STEP 1: Scrape tweets
  const { profile, tweets, transcript } = await scrapeTweets(
    request.profileInput,
    request.maxTweets || 42,
    onStatus
  );

  if (tweets.length === 0) {
    throw new Error("No tweets available to build the autobiography.");
  }

  // STEP 2: Synthesize narrative
  const style = request.style || "vhs_cinema";
  const { narrative, scenes } = await synthesizeNarrative(
    profile,
    tweets,
    transcript,
    style,
    onStatus
  );

  // STEP 3: Generate video
  const videoUrls = await generateVideoViaElizaOS(scenes, MYTHX_ELIZA_AGENT_ID, onStatus);

  // STEP 4: Upload & save
  const { firebaseStorageUrl, galleryUrl } = await uploadToFirebaseAndSave(
    jobId,
    videoUrls,
    scenes,
    profile,
    style
  );

  // STEP 5: Post to Twitter (if triggered from Twitter or explicitly requested)
  let postedToTwitter = false;
  let twitterPostUrl: string | null = null;

  if (request.triggerFromTwitter || request.replyToTweetId) {
    const postResult = await postToTwitter(
      profile,
      style,
      galleryUrl,
      request.replyToTweetId
    );
    postedToTwitter = postResult.posted;
    twitterPostUrl = postResult.postUrl;
  }

  // Use promo code if valid
  if (promoCodeUsed && request.wallet) {
    await usePromoCode({
      code: promoCodeUsed,
      jobId,
      wallet: request.wallet || "anonymous",
      profileInput: request.profileInput,
      style,
    });
  }

  const processingTimeMs = Date.now() - startTime;

  return {
    jobId,
    profile,
    tweets,
    transcript,
    narrative,
    scenes,
    videoUrl: videoUrls[0] || null,
    firebaseStorageUrl,
    galleryUrl,
    postedToTwitter,
    twitterPostUrl,
    promoCodeUsed,
    metadata: {
      style,
      totalScenes: scenes.length,
      totalDurationSeconds: scenes.reduce((sum, s) => sum + s.durationSeconds, 0),
      processingTimeMs,
    },
  };
}

/**
 * Handle Twitter command - entry point for @mentions processing
 */
export async function handleTwitterCommand(
  command: XCommandParseResult,
  mentionTweetId: string,
  authorUsername: string
): Promise<{
  replyText: string;
  videoResult?: MythXElizaResponse;
}> {
  if (!command.isCommand) {
    return {
      replyText: "Hey! To generate a video, use: @MythXEliza generate @username [style] [promoCode]",
    };
  }

  switch (command.action) {
    case "generate": {
      try {
        const result = await generateMythXElizaVideo(
          {
            profileInput: command.profileInput!,
            style: command.style || undefined,
            promoCode: command.promoCode,
            triggerFromTwitter: true,
            replyToTweetId: mentionTweetId,
            jobId: `mythx-x-${randomUUID()}`,
            wallet: `twitter-${authorUsername}`,
          },
          async (status, progress) => {
            console.log(`[MythXEliza][${progress}%] ${status}`);
            // Optionally tweet progress updates here
          }
        );

        return {
          replyText: XClient.buildGenerationReply({
            profileUsername: result.profile.username,
            status: "completed",
            videoUrl: result.galleryUrl,
          }),
          videoResult: result,
        };
      } catch (error) {
        return {
          replyText: XClient.buildGenerationReply({
            profileUsername: command.profileInput || "unknown",
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
          }),
        };
      }
    }

    case "help":
      return {
        replyText: `🎬 MythXEliza Help:

Generate video: @MythXEliza generate @username [style] [promoCode]

Styles: vhs_cinema, black_and_white_noir, hyperflow_assembly, double_exposure, glitch_digital, found_footage_raw, split_screen_diptych, film_grain_70s

Promo codes: MYTHX-FREE, ELIZA-VIP, CINEMA-TRIAL

Example: @MythXEliza generate @elonmusk vhs_cinema MYTHX-FREE`,
      };

    case "status":
      return {
        replyText: "🤖 MythXEliza is online and generating videos! Check the gallery: /gallery",
      };

    default:
      return {
        replyText: "👋 Mention @MythXEliza generate @username to create an autobiographical video!",
      };
  }
}

/**
 * Process all unhandled mentions on X
 */
export async function processTwitterMentions(
  processedTweetIds: Set<string>
): Promise<Array<{ tweetId: string; replyText: string; success: boolean }>> {
  const xClient = getXClient();
  const mentions = await xClient.getMentions({ maxResults: 20 });

  const results: Array<{ tweetId: string; replyText: string; success: boolean }> = [];

  for (const mention of mentions) {
    // Skip already processed
    if (processedTweetIds.has(mention.id)) {
      continue;
    }

    const command = xClient.parseCommand(mention.text);

    if (!command.isCommand) {
      continue;
    }

    try {
      const response = await handleTwitterCommand(command, mention.id, mention.authorUsername);

      results.push({
        tweetId: mention.id,
        replyText: response.replyText,
        success: !!response.videoResult,
      });

      // Mark as processed
      processedTweetIds.add(mention.id);
    } catch (error) {
      console.error(`[MythXEliza] Failed to process mention ${mention.id}:`, error);

      results.push({
        tweetId: mention.id,
        replyText: "❌ Sorry, there was an error processing your request. Please try again.",
        success: false,
      });

      processedTweetIds.add(mention.id);
    }
  }

  return results;
}
