import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import { createPromptVideoJob, getJob, getVideo } from "@/lib/jobs/repository";
import { triggerJobProcessing } from "@/lib/jobs/trigger";
import { fetchXProfileTweets } from "@/lib/x/api";
import { getXClient } from "@/lib/x/client";
import { JobDocument } from "@/lib/types/domain";

const MENTIONS_FILE = "/data/x-bot/mentions.json";
const RAILWAY_VIDEO_DIR = "/data/videos";
const POLL_INTERVAL_MS = 30_000;
const MAX_RETRIES = 3;

// ── Deduplication store ─────────────────────────────────────────────

interface MentionsStore {
  processedTweetIds: string[];
  lastPollAt: string | null;
}

function ensureMentionsDir(): void {
  const dir = dirname(MENTIONS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function loadMentionsStore(): Promise<MentionsStore> {
  try {
    if (existsSync(MENTIONS_FILE)) {
      const raw = await readFile(MENTIONS_FILE, "utf-8");
      return JSON.parse(raw) as MentionsStore;
    }
  } catch (err) {
    logger.warn("x_bot_load_mentions_failed", {
      component: "x-bot",
      stage: "load_mentions",
      errorCode: "load_mentions_failed",
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }
  return { processedTweetIds: [], lastPollAt: null };
}

async function saveMentionsStore(store: MentionsStore): Promise<void> {
  ensureMentionsDir();
  await writeFile(MENTIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function isProcessed(store: MentionsStore, tweetId: string): boolean {
  return store.processedTweetIds.includes(tweetId);
}

function markProcessed(store: MentionsStore, tweetId: string): void {
  // Keep only last 10000 to prevent unbounded growth
  const ids = [...store.processedTweetIds, tweetId];
  store.processedTweetIds = ids.slice(-10_000);
}

// ── Mention extraction ──────────────────────────────────────────────

interface MentionInfo {
  tweetId: string;
  text: string;
  authorUsername: string;
  authorId: string;
  createdAt: string;
}

async function fetchMentions(since?: string): Promise<MentionInfo[]> {
  const env = getEnv();
  const client = getXClient();

  if (!client.canPost()) {
    logger.warn("x_bot_oauth_not_configured", {
      component: "x-bot",
      stage: "fetch_mentions",
      errorCode: "oauth_not_configured",
      errorMessage:
        "X API OAuth credentials not configured; mention polling disabled.",
    });
    return [];
  }

  const mentions: MentionInfo[] = [];

  try {
    const result = await client.getMentions({ maxResults: 20 });

    for (const mention of result) {
      // Skip if we have a since filter
      if (since) {
        const mentionTime = new Date(mention.createdAt).getTime();
        const sinceTime = new Date(since).getTime();
        if (mentionTime <= sinceTime) continue;
      }

      mentions.push({
        tweetId: mention.id,
        text: mention.text,
        authorUsername: mention.authorUsername,
        authorId: mention.authorId,
        createdAt: mention.createdAt,
      });
    }
  } catch (err) {
    logger.error("x_bot_fetch_mentions_failed", {
      component: "x-bot",
      stage: "fetch_mentions",
      errorCode: "fetch_mentions_failed",
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }

  return mentions;
}

// ── Extract target username from mention ────────────────────────────

function extractTargetUsername(text: string): string | null {
  // Look for @username patterns (not @HyperMythsX itself)
  const botHandle = "hypermythsx";
  const mentions = text.match(/@(\w+)/g) || [];
  for (const mention of mentions) {
    const handle = mention.slice(1).toLowerCase();
    if (handle !== botHandle && handle !== "hypermythsx") {
      return mention.slice(1);
    }
  }
  return null;
}

// ── Job creation from X mention ─────────────────────────────────────

async function createAutobiographyFromMention(
  username: string,
  mentionText: string,
): Promise<JobDocument> {
  const profileInput = `@${username}`;
  let subjectName = profileInput;
  let sourceMediaUrl: string | null = null;
  let sourceTranscript: string | null = null;

  try {
    const profile = await fetchXProfileTweets({ profileInput, maxTweets: 16 });
    subjectName =
      profile.profile.displayName ||
      (profile.profile.username
        ? `@${profile.profile.username}`
        : profileInput);
    sourceMediaUrl = profile.profile.profileUrl;
    sourceTranscript = profile.transcript;
  } catch (err) {
    logger.warn("x_bot_profile_hydration_failed", {
      component: "x-bot",
      stage: "hydrate_profile",
      username,
      errorCode: "profile_hydration_failed",
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
    throw err;
  }

  return createPromptVideoJob({
    requestKind: "mythx",
    packageType: "60s",
    subjectName,
    subjectDescription: `Autobiography built from @${username}'s tweets. Mentioned: "${mentionText.slice(0, 120)}"`,
    sourceMediaUrl,
    sourceMediaProvider: "x",
    sourceTranscript,
    videoSeconds: 60,
    paymentWaived: true,
  });
}

// ── Post video as reply ─────────────────────────────────────────────

function getLocalVideoPath(jobId: string): string {
  return `${RAILWAY_VIDEO_DIR}/${jobId}.mp4`;
}

async function waitForVideoCompletion(
  jobId: string,
  timeoutMs: number = 10 * 60 * 1000,
): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await getJob(jobId);
    if (!job) return false;
    if (job.status === "complete") return true;
    if (job.status === "failed") return false;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  return false;
}

async function postVideoReply(
  client: ReturnType<typeof getXClient>,
  inReplyToTweetId: string,
  jobId: string,
  profileUsername: string,
): Promise<void> {
  const videoPath = getLocalVideoPath(jobId);

  // For X, we can't directly upload video files via API v2 without media upload endpoint.
  // Instead, we post a reply with the video URL.
  const video = await getVideo(jobId);
  const videoUrl = video?.videoUrl;

  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const galleryUrl =
    videoUrl || `${appBaseUrl}/api/video/${jobId}?download=true`;

  const caption = `Your autobiography, from @HyperMythsX ✨\n\nWatch: ${galleryUrl}`;

  await client.replyToTweet({
    tweetId: inReplyToTweetId,
    text: caption,
  });

  logger.info("x_bot_video_posted", {
    component: "x-bot",
    stage: "post_video",
    jobId,
    inReplyToTweetId,
    profileUsername,
  });
}

async function postProgressReply(
  client: ReturnType<typeof getXClient>,
  inReplyToTweetId: string,
  profileUsername: string,
  progress: string,
): Promise<void> {
  const messages: Record<string, string> = {
    started: `Starting your autobiography video, @${profileUsername}! This will take a few minutes.`,
    processing: `Working on your video, @${profileUsername}...`,
  };

  const text =
    messages[progress] || `Processing your request, @${profileUsername}...`;

  await client.replyToTweet({
    tweetId: inReplyToTweetId,
    text,
  });
}

// ── Main polling loop ───────────────────────────────────────────────

async function processMention(
  mention: MentionInfo,
  store: MentionsStore,
): Promise<void> {
  const client = getXClient();
  const username = extractTargetUsername(mention.text);

  if (!username) {
    logger.info("x_bot_no_username_found", {
      component: "x-bot",
      stage: "process_mention",
      tweetId: mention.tweetId,
      text: mention.text,
    });
    return;
  }

  logger.info("x_bot_processing_mention", {
    component: "x-bot",
    stage: "process_mention",
    tweetId: mention.tweetId,
    username,
    authorUsername: mention.authorUsername,
  });

  let retries = 0;
  let lastError: Error | null = null;

  while (retries < MAX_RETRIES) {
    try {
      // Step 1: Create the job
      const job = await createAutobiographyFromMention(username, mention.text);

      logger.info("x_bot_job_created", {
        component: "x-bot",
        stage: "create_job",
        jobId: job.jobId,
        tweetId: mention.tweetId,
        username,
      });

      // Step 2: Trigger processing
      await triggerJobProcessing(job.jobId).catch((err) => {
        logger.error("x_bot_trigger_failed", {
          component: "x-bot",
          stage: "trigger_processing",
          jobId: job.jobId,
          errorCode: "trigger_failed",
          errorMessage: err instanceof Error ? err.message : "unknown",
        });
      });

      // Step 3: Wait for video to complete
      const completed = await waitForVideoCompletion(job.jobId);

      if (!completed) {
        const finalJob = await getJob(job.jobId);
        const failed = finalJob?.status === "failed";

        if (failed) {
          await postProgressReply(client, mention.tweetId, username, "failed");
          logger.warn("x_bot_video_generation_failed", {
            component: "x-bot",
            stage: "wait_completion",
            jobId: job.jobId,
            tweetId: mention.tweetId,
          });
        } else {
          await postProgressReply(
            client,
            mention.tweetId,
            username,
            "processing",
          );
        }
        return;
      }

      // Step 4: Post the video reply
      await postVideoReply(client, mention.tweetId, job.jobId, username);

      // Step 5: Mark as processed
      markProcessed(store, mention.tweetId);
      store.lastPollAt = new Date().toISOString();
      await saveMentionsStore(store);

      logger.info("x_bot_mention_complete", {
        component: "x-bot",
        stage: "process_mention",
        jobId: job.jobId,
        tweetId: mention.tweetId,
        username,
      });

      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      retries++;
      logger.warn("x_bot_mention_retry", {
        component: "x-bot",
        stage: "process_mention",
        tweetId: mention.tweetId,
        username,
        attempt: retries,
        errorCode: "mention_processing_failed",
        errorMessage: lastError.message,
      });

      if (retries < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 5_000 * retries));
      }
    }
  }

  // All retries exhausted
  logger.error("x_bot_mention_exhausted", {
    component: "x-bot",
    stage: "process_mention",
    tweetId: mention.tweetId,
    username,
    errorCode: "max_retries_exceeded",
    errorMessage: lastError?.message ?? "Unknown error",
  });

  // Still mark as processed to avoid infinite retry loops
  markProcessed(store, mention.tweetId);
  store.lastPollAt = new Date().toISOString();
  await saveMentionsStore(store);
}

async function pollMentions(): Promise<void> {
  const store = await loadMentionsStore();
  const mentions = await fetchMentions(store.lastPollAt || undefined);

  const newMentions = mentions.filter((m) => !isProcessed(store, m.tweetId));

  if (newMentions.length === 0) {
    return;
  }

  logger.info("x_bot_new_mentions", {
    component: "x-bot",
    stage: "poll_mentions",
    count: newMentions.length,
  });

  // Process sequentially to avoid race conditions
  for (const mention of newMentions) {
    await processMention(mention, store);
  }
}

function startXBotPolling(): NodeJS.Timeout | null {
  const env = getEnv();
  const client = getXClient();

  if (!client.canPost()) {
    logger.warn("x_bot_disabled", {
      component: "x-bot",
      stage: "startup",
      errorCode: "oauth_not_configured",
      errorMessage:
        "X API OAuth credentials not configured; X bot will not start.",
    });
    return null;
  }

  logger.info("x_bot_started", {
    component: "x-bot",
    stage: "startup",
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  // Run immediately on start
  void pollMentions().catch((err) => {
    logger.error("x_bot_initial_poll_failed", {
      component: "x-bot",
      stage: "initial_poll",
      errorCode: "poll_failed",
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
  });

  const interval = setInterval(() => {
    void pollMentions().catch((err) => {
      logger.error("x_bot_poll_failed", {
        component: "x-bot",
        stage: "poll_mentions",
        errorCode: "poll_failed",
        errorMessage: err instanceof Error ? err.message : "unknown",
      });
    });
  }, POLL_INTERVAL_MS);

  return interval;
}

export { startXBotPolling };
