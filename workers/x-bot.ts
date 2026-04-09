// X (Twitter) bot — mention-based video generation.
// Account: @HyperMythsX — https://x.com/HyperMythX
//
// Usage patterns (mention @HyperMythsX):
//   @HyperMythsX @someone       → MythX: autobiography for @someone
//   @HyperMythsX wallet <addr>  → HashMyth: token/wallet video
//   @HyperMythsX <addr>         → HashMyth: auto-detect address
//   @HyperMythsX random         → Random cinema video
//
// Polls mentions every 30s. Replies with job URL immediately,
// then posts video URL when complete.

import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { logger } from "@/lib/logging/logger";
import { createPromptVideoJob, createTokenVideoJob, getJob, getVideo } from "@/lib/jobs/repository";
import { triggerJobProcessing } from "@/lib/jobs/trigger";
import { fetchXProfileTweets } from "@/lib/x/api";
import { getXClient } from "@/lib/x/client";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { JobDocument, SupportedTokenChain } from "@/lib/types/domain";

const APP_BASE_URL = process.env.APP_BASE_URL || "https://hypercinema.app";
const BOT_HANDLE = "hypermythsx"; // @HyperMythsX — https://x.com/HyperMythX
const BOT_X_URL = "https://x.com/HyperMythX";
const MENTIONS_FILE = "/data/x-bot/mentions.json";
const POLL_INTERVAL_MS = 30_000;
const MAX_RETRIES = 3;

// ── Input detection ──────────────────────────────────────────────────

function detectMentionIntent(text: string): {
  type: "mythx" | "hashmyth" | "random";
  target: string;
} {
  const clean = text.replace(new RegExp(`@${BOT_HANDLE}`, "gi"), "").trim();

  // Explicit "random"
  if (/^random$/i.test(clean)) return { type: "random", target: "" };

  // Explicit "wallet <address>"
  const walletMatch = clean.match(/^wallet\s+(\S+)/i);
  if (walletMatch) {
    const addr = walletMatch[1].trim();
    return { type: "hashmyth", target: addr };
  }

  // Raw Solana address (32-44 base58 chars)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) {
    return { type: "hashmyth", target: clean };
  }

  // Raw EVM address
  if (/^0x[a-fA-F0-9]{40}$/.test(clean)) {
    return { type: "hashmyth", target: clean };
  }

  // @username (not the bot itself)
  const handles = (clean.match(/@(\w+)/g) || [])
    .map((h) => h.slice(1))
    .filter((h) => h.toLowerCase() !== BOT_HANDLE);

  if (handles.length > 0) return { type: "mythx", target: handles[0] };

  // Bare username without @
  if (/^[a-zA-Z][a-zA-Z0-9_]{1,14}$/.test(clean)) return { type: "mythx", target: clean };

  // Fallback: random
  return { type: "random", target: "" };
}

// ── Deduplication ────────────────────────────────────────────────────

interface MentionsStore { processedTweetIds: string[]; lastPollAt: string | null }

function ensureMentionsDir() {
  const dir = dirname(MENTIONS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function loadMentionsStore(): Promise<MentionsStore> {
  try {
    if (existsSync(MENTIONS_FILE)) return JSON.parse(await readFile(MENTIONS_FILE, "utf-8"));
  } catch { /* ignore */ }
  return { processedTweetIds: [], lastPollAt: null };
}

async function saveMentionsStore(store: MentionsStore): Promise<void> {
  ensureMentionsDir();
  await writeFile(MENTIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function markProcessed(store: MentionsStore, tweetId: string): void {
  store.processedTweetIds = [...store.processedTweetIds, tweetId].slice(-10_000);
}

// ── Job creation ─────────────────────────────────────────────────────

const RANDOM_PROMPTS = [
  "The rise and fall of a forgotten memecoin, told through blockchain whispers.",
  "A whale silently moves markets at midnight. What are they planning?",
  "From penny to moon: the untold story of a Solana airdrop nobody expected.",
  "The last block before the rug pull. A cinematic thriller.",
];

async function createMythxJob(username: string, mentionText: string): Promise<JobDocument> {
  let subjectName = `@${username}`;
  let sourceMediaUrl: string | null = null;
  let sourceTranscript: string | null = null;

  try {
    const profile = await fetchXProfileTweets({ profileInput: `@${username}`, maxTweets: 16 });
    subjectName = profile.profile.displayName || `@${profile.profile.username || username}`;
    sourceMediaUrl = profile.profile.profileUrl;
    sourceTranscript = profile.transcript;
  } catch (err) {
    logger.warn("x_bot_profile_hydration_failed", {
      component: "x-bot", username, errorMessage: err instanceof Error ? err.message : "unknown",
    });
    throw err;
  }

  return createPromptVideoJob({
    requestKind: "mythx", packageType: "30s",
    subjectName,
    subjectDescription: `Autobiography from @${username}'s tweets. Requested: "${mentionText.slice(0, 100)}"`,
    sourceMediaUrl, sourceMediaProvider: "x", sourceTranscript,
    paymentWaived: true, experience: "mythx",
  });
}

async function createHashmythJob(address: string): Promise<JobDocument> {
  let subjectName: string | null = null;
  let subjectSymbol: string | null = null;
  let subjectImage: string | null = null;
  let subjectDescription: string | null = null;
  let chain: SupportedTokenChain = "solana";

  try {
    const token = await resolveMemecoinMetadata({ address, chain: "auto" });
    subjectName = token.name; subjectSymbol = token.symbol;
    subjectImage = token.image; subjectDescription = token.description;
    chain = token.chain;
  } catch (err) {
    logger.warn("x_bot_hashmyth_metadata_failed", {
      component: "x-bot", address, errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }

  return createTokenVideoJob({
    tokenAddress: address, packageType: "30s",
    subjectChain: chain, subjectName, subjectSymbol,
    subjectImage, subjectDescription, paymentWaived: true,
  });
}

async function createRandomJob(): Promise<JobDocument> {
  const prompt = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
  return createPromptVideoJob({
    requestKind: "generic_cinema", packageType: "30s",
    subjectName: "Random Cinema", subjectDescription: prompt,
    requestedPrompt: prompt, paymentWaived: true,
  });
}

// ── Posting replies ──────────────────────────────────────────────────

async function postStartReply(
  client: ReturnType<typeof getXClient>,
  tweetId: string,
  authorUsername: string,
  jobId: string,
  label: string,
): Promise<void> {
  const jobUrl = `${APP_BASE_URL}/job/${jobId}`;
  const text = `@${authorUsername} 🎬 ${label} started!\n\nTrack it live: ${jobUrl}\n\nWill reply with video when ready.\n\n— @HyperMythsX · ${BOT_X_URL}`;
  try {
    await client.replyToTweet({ tweetId, text });
  } catch (err) {
    logger.error("x_bot_start_reply_failed", {
      component: "x-bot", tweetId, errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }
}

async function postCompletionReply(
  client: ReturnType<typeof getXClient>,
  tweetId: string,
  authorUsername: string,
  jobId: string,
): Promise<void> {
  const video = await getVideo(jobId);
  const videoUrl = video?.videoUrl || `${APP_BASE_URL}/job/${jobId}`;
  const text = `@${authorUsername} ✅ Your video is ready!\n\n📹 ${videoUrl}`;
  try {
    await client.replyToTweet({ tweetId, text });
  } catch (err) {
    logger.error("x_bot_completion_reply_failed", {
      component: "x-bot", tweetId, jobId, errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }
}

// ── Mention processing ───────────────────────────────────────────────

interface MentionInfo {
  tweetId: string;
  text: string;
  authorUsername: string;
  authorId: string;
  createdAt: string;
}

async function processMention(mention: MentionInfo, store: MentionsStore): Promise<void> {
  const client = getXClient();
  const { type, target } = detectMentionIntent(mention.text);

  logger.info("x_bot_processing_mention", {
    component: "x-bot", tweetId: mention.tweetId,
    author: mention.authorUsername, type, target: target.slice(0, 40),
  });

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      let job: JobDocument;
      let label: string;

      if (type === "random") {
        job = await createRandomJob();
        label = "Random cinema video";
      } else if (type === "hashmyth") {
        job = await createHashmythJob(target);
        label = `HashMyth video for ${target.slice(0, 12)}...`;
      } else {
        job = await createMythxJob(target, mention.text);
        label = `MythX autobiography for @${target}`;
      }

      logger.info("x_bot_job_created", {
        component: "x-bot", jobId: job.jobId, tweetId: mention.tweetId, type, target,
      });

      // Reply with job URL immediately
      await postStartReply(client, mention.tweetId, mention.authorUsername, job.jobId, label);

      // Trigger processing
      await triggerJobProcessing(job.jobId).catch((err) => {
        logger.error("x_bot_trigger_failed", {
          component: "x-bot", jobId: job.jobId,
          errorMessage: err instanceof Error ? err.message : "unknown",
        });
      });

      // Wait for completion (10 min max)
      const started = Date.now();
      let completed = false;
      while (Date.now() - started < 10 * 60 * 1000) {
        const j = await getJob(job.jobId);
        if (!j) break;
        if (j.status === "complete") { completed = true; break; }
        if (j.status === "failed") break;
        await new Promise((r) => setTimeout(r, 15_000));
      }

      if (completed) {
        await postCompletionReply(client, mention.tweetId, mention.authorUsername, job.jobId);
      }

      markProcessed(store, mention.tweetId);
      store.lastPollAt = new Date().toISOString();
      await saveMentionsStore(store);
      return;

    } catch (err) {
      retries++;
      logger.warn("x_bot_mention_retry", {
        component: "x-bot", tweetId: mention.tweetId, attempt: retries,
        errorMessage: err instanceof Error ? err.message : "unknown",
      });
      if (retries < MAX_RETRIES) await new Promise((r) => setTimeout(r, 5_000 * retries));
    }
  }

  // Exhausted retries — still mark processed to avoid infinite loops
  logger.error("x_bot_mention_exhausted", {
    component: "x-bot", tweetId: mention.tweetId, type, target,
  });
  markProcessed(store, mention.tweetId);
  store.lastPollAt = new Date().toISOString();
  await saveMentionsStore(store);
}

// ── Poll loop ────────────────────────────────────────────────────────

async function fetchMentions(since?: string | null): Promise<MentionInfo[]> {
  const client = getXClient();
  if (!client.canPost()) return [];

  const mentions: MentionInfo[] = [];
  try {
    const result = await client.getMentions({ maxResults: 20 });
    for (const m of result) {
      if (since) {
        if (new Date(m.createdAt).getTime() <= new Date(since).getTime()) continue;
      }
      mentions.push({
        tweetId: m.id, text: m.text,
        authorUsername: m.authorUsername, authorId: m.authorId, createdAt: m.createdAt,
      });
    }
  } catch (err) {
    logger.error("x_bot_fetch_mentions_failed", {
      component: "x-bot", errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }
  return mentions;
}

async function pollMentions(): Promise<void> {
  const store = await loadMentionsStore();
  const mentions = await fetchMentions(store.lastPollAt);
  const newMentions = mentions.filter((m) => !store.processedTweetIds.includes(m.tweetId));

  if (newMentions.length === 0) return;

  logger.info("x_bot_new_mentions", { component: "x-bot", count: newMentions.length });
  for (const m of newMentions) await processMention(m, store);
}

function startXBotPolling(): NodeJS.Timeout | null {
  const client = getXClient();
  if (!client.canPost()) {
    logger.warn("x_bot_disabled", {
      component: "x-bot", stage: "startup",
      errorMessage: "X API OAuth not configured; X bot will not start.",
    });
    return null;
  }

  logger.info("x_bot_started", { component: "x-bot", stage: "startup", pollIntervalMs: POLL_INTERVAL_MS });

  void pollMentions().catch((err) => {
    logger.error("x_bot_initial_poll_failed", {
      component: "x-bot", errorMessage: err instanceof Error ? err.message : "unknown",
    });
  });

  return setInterval(() => {
    void pollMentions().catch((err) => {
      logger.error("x_bot_poll_failed", {
        component: "x-bot", errorMessage: err instanceof Error ? err.message : "unknown",
      });
    });
  }, POLL_INTERVAL_MS);
}

export { startXBotPolling };
