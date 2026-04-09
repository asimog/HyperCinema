import TelegramBot from "node-telegram-bot-api";
import { existsSync, createReadStream } from "fs";
import { stat } from "fs/promises";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logging/logger";
import {
  createPromptVideoJob,
  createTokenVideoJob,
} from "@/lib/jobs/repository";
import { getJob, getVideo } from "@/lib/jobs/repository";
import { triggerJobProcessing } from "@/lib/jobs/trigger";
import { fetchXProfileTweets } from "@/lib/x/api";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { JobDocument, SupportedTokenChain } from "@/lib/types/domain";

const RAILWAY_VIDEO_DIR = "/data/videos";

// ── Rate limiting (mirrors web limits) ──────────────────────────────

interface RateWindow {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateWindow>();

function checkRateLimit(key: string, maxPerDay: number): boolean {
  const now = Date.now();
  const window = rateLimitStore.get(key);
  if (!window || now > window.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  if (window.count >= maxPerDay) return false;
  window.count++;
  return true;
}

function profileRateKey(chatId: number): string {
  return `tg:profile:${chatId}`;
}
function walletRateKey(chatId: number): string {
  return `tg:wallet:${chatId}`;
}
function ipRateKey(chatId: number): string {
  return `tg:ip:${chatId}`;
}

// ── Video delivery helpers ──────────────────────────────────────────

function getLocalVideoPath(jobId: string): string {
  return `${RAILWAY_VIDEO_DIR}/${jobId}.mp4`;
}

function getLocalThumbnailPath(jobId: string): string {
  return `${RAILWAY_VIDEO_DIR}/${jobId}-thumbnail.jpg`;
}

async function sendVideoFile(
  bot: TelegramBot,
  chatId: number,
  jobId: string,
): Promise<boolean> {
  const localPath = getLocalVideoPath(jobId);
  if (!existsSync(localPath)) {
    logger.warn("tg_video_file_not_found", {
      component: "telegram-bot",
      stage: "send_video",
      jobId,
      chatId,
      localPath,
    });
    return false;
  }

  const fileStats = await stat(localPath);
  const thumbPath = getLocalThumbnailPath(jobId);
  const thumb = existsSync(thumbPath) ? thumbPath : undefined;

  await bot
    .sendVideo(chatId, createReadStream(localPath), {
      caption: "Your autobiography, from HyperMythsX",
      thumbnail: thumb,
      supports_streaming: true,
    })
    .then(() => {
      logger.info("tg_video_sent", {
        component: "telegram-bot",
        stage: "send_video",
        jobId,
        chatId,
        sizeBytes: fileStats.size,
      });
    })
    .catch((err) => {
      logger.error("tg_send_video_failed", {
        component: "telegram-bot",
        stage: "send_video",
        jobId,
        chatId,
        errorCode: "tg_send_failed",
        errorMessage: err instanceof Error ? err.message : "unknown",
      });
    });

  return true;
}

// ── Job creation helpers ────────────────────────────────────────────

async function createMythxJob(profileInput: string): Promise<JobDocument> {
  let subjectName = profileInput.startsWith("@")
    ? profileInput
    : `@${profileInput}`;
  let sourceMediaUrl: string | null = null;
  let sourceTranscript: string | null = null;

  try {
    const profile = await fetchXProfileTweets({ profileInput, maxTweets: 42 });
    subjectName =
      profile.profile.displayName ||
      (profile.profile.username ? `@${profile.profile.username}` : subjectName);
    sourceMediaUrl = profile.profile.profileUrl;
    sourceTranscript = profile.transcript;
  } catch (err) {
    logger.warn("tg_mythx_profile_hydration_failed", {
      component: "telegram-bot",
      stage: "hydrate_mythx_profile",
      profileInput,
      errorCode: "mythx_profile_hydration_failed",
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }

  return createPromptVideoJob({
    requestKind: "mythx",
    packageType: "60s",
    subjectName,
    subjectDescription: `Autobiography built from ${profileInput}'s tweets.`,
    sourceMediaUrl,
    sourceMediaProvider: "x",
    sourceTranscript,
    videoSeconds: 60,
    paymentWaived: true,
  });
}

async function createHashmythJob(input: string): Promise<JobDocument> {
  const trimmed = input.trim();
  let subjectName: string | null = null;
  let subjectSymbol: string | null = null;
  let subjectImage: string | null = null;
  let subjectDescription: string | null = null;
  let chain: SupportedTokenChain | null = null;

  try {
    const token = await resolveMemecoinMetadata({
      address: trimmed,
      chain: "auto",
    });
    subjectName = token.name;
    subjectSymbol = token.symbol;
    subjectImage = token.image;
    subjectDescription = token.description;
    chain = token.chain;
  } catch (err) {
    logger.warn("tg_hashmyth_metadata_failed", {
      component: "telegram-bot",
      stage: "resolve_token",
      address: trimmed,
      errorCode: "token_metadata_failed",
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }

  return createTokenVideoJob({
    tokenAddress: trimmed,
    packageType: "60s",
    subjectChain: chain ?? "solana",
    subjectName,
    subjectSymbol,
    subjectImage,
    subjectDescription,
    paymentWaived: true,
  });
}

async function createRandomJob(): Promise<JobDocument> {
  const randomTopics = [
    "The rise and fall of Dogecoin, told through blockchain whispers.",
    "A midnight trader's journey through Solana memecoins.",
    "From zero to hero: the story of a forgotten memecoin.",
    "The whale who moved markets and vanished.",
    "A DeFi degenerate's love letter to liquidity pools.",
  ];
  const prompt = randomTopics[Math.floor(Math.random() * randomTopics.length)];

  return createPromptVideoJob({
    requestKind: "generic_cinema",
    packageType: "30s",
    subjectName: "Random Cinema",
    subjectDescription: prompt,
    requestedPrompt: prompt,
    videoSeconds: 30,
    paymentWaived: true,
  });
}

// ── Bot setup ───────────────────────────────────────────────────────

function setupTelegramBot(): TelegramBot | null {
  const env = getEnv();
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.warn("tg_bot_disabled", {
      component: "telegram-bot",
      stage: "startup",
      errorCode: "missing_token",
      errorMessage: "TELEGRAM_BOT_TOKEN not set; Telegram bot will not start.",
    });
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  // ── /start ────────────────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const welcome = [
      "Welcome to HyperMythsX! I can generate AI autobiography videos for you.",
      "",
      "Available commands:",
      "  /mythx @username — Generate an autobiography video from an X profile",
      "  /hashmyth <address> — Scan a wallet or memecoin, generate a video",
      "  /random — Generate a random TikTok-style cinema video",
      "  /status <jobId> — Check the status of a video job",
      "",
      "Rate limits: 2 profile videos/day, 2 wallet videos/day, 5 random/day.",
    ].join("\n");

    await bot.sendMessage(chatId, welcome);
    logger.info("tg_start", {
      component: "telegram-bot",
      stage: "start_command",
      chatId,
      username: msg.from?.username,
    });
  });

  // ── /mythx ────────────────────────────────────────────────────────
  bot.onText(/\/mythx\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const profileInput = match![1].trim();

    if (!checkRateLimit(profileRateKey(chatId), 2)) {
      await bot.sendMessage(
        chatId,
        "Rate limit reached: 2 profile videos per day. Please try again tomorrow.",
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `Generating MythX autobiography for ${profileInput}... This will take a few minutes.`,
    );

    try {
      const job = await createMythxJob(profileInput);
      logger.info("tg_mythx_job_created", {
        component: "telegram-bot",
        stage: "mythx_command",
        chatId,
        jobId: job.jobId,
        profileInput,
      });

      await bot.sendMessage(
        chatId,
        `Video job created: \`${job.jobId}\`\nUse /status ${job.jobId} to check progress.`,
        {
          parse_mode: "Markdown",
        },
      );

      await triggerJobProcessing(job.jobId).catch((err) => {
        logger.error("tg_mythx_trigger_failed", {
          component: "telegram-bot",
          stage: "trigger_processing",
          jobId: job.jobId,
          chatId,
          errorCode: "trigger_failed",
          errorMessage: err instanceof Error ? err.message : "unknown",
        });
      });
    } catch (err) {
      await bot.sendMessage(
        chatId,
        `Failed to create video job: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      logger.error("tg_mythx_job_failed", {
        component: "telegram-bot",
        stage: "mythx_command",
        chatId,
        profileInput,
        errorCode: "job_creation_failed",
        errorMessage: err instanceof Error ? err.message : "unknown",
      });
    }
  });

  // ── /hashmyth ─────────────────────────────────────────────────────
  bot.onText(/\/hashmyth\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const address = match![1].trim();

    if (!checkRateLimit(walletRateKey(chatId), 2)) {
      await bot.sendMessage(
        chatId,
        "Rate limit reached: 2 wallet videos per day. Please try again tomorrow.",
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `Scanning ${address} and generating video... This will take a few minutes.`,
    );

    try {
      const job = await createHashmythJob(address);
      logger.info("tg_hashmyth_job_created", {
        component: "telegram-bot",
        stage: "hashmyth_command",
        chatId,
        jobId: job.jobId,
        address,
      });

      await bot.sendMessage(
        chatId,
        `Video job created: \`${job.jobId}\`\nUse /status ${job.jobId} to check progress.`,
        {
          parse_mode: "Markdown",
        },
      );

      await triggerJobProcessing(job.jobId).catch((err) => {
        logger.error("tg_hashmyth_trigger_failed", {
          component: "telegram-bot",
          stage: "trigger_processing",
          jobId: job.jobId,
          chatId,
          errorCode: "trigger_failed",
          errorMessage: err instanceof Error ? err.message : "unknown",
        });
      });
    } catch (err) {
      await bot.sendMessage(
        chatId,
        `Failed to create video job: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      logger.error("tg_hashmyth_job_failed", {
        component: "telegram-bot",
        stage: "hashmyth_command",
        chatId,
        address,
        errorCode: "job_creation_failed",
        errorMessage: err instanceof Error ? err.message : "unknown",
      });
    }
  });

  // ── /random ───────────────────────────────────────────────────────
  bot.onText(/\/random/, async (msg) => {
    const chatId = msg.chat.id;

    if (!checkRateLimit(ipRateKey(chatId), 5)) {
      await bot.sendMessage(
        chatId,
        "Rate limit reached: 5 random videos per day. Please try again tomorrow.",
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      "Generating a random TikTok-style cinema video...",
    );

    try {
      const job = await createRandomJob();
      logger.info("tg_random_job_created", {
        component: "telegram-bot",
        stage: "random_command",
        chatId,
        jobId: job.jobId,
      });

      await bot.sendMessage(
        chatId,
        `Video job created: \`${job.jobId}\`\nUse /status ${job.jobId} to check progress.`,
        {
          parse_mode: "Markdown",
        },
      );

      await triggerJobProcessing(job.jobId).catch((err) => {
        logger.error("tg_random_trigger_failed", {
          component: "telegram-bot",
          stage: "trigger_processing",
          jobId: job.jobId,
          chatId,
          errorCode: "trigger_failed",
          errorMessage: err instanceof Error ? err.message : "unknown",
        });
      });
    } catch (err) {
      await bot.sendMessage(
        chatId,
        `Failed to create video job: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      logger.error("tg_random_job_failed", {
        component: "telegram-bot",
        stage: "random_command",
        chatId,
        errorCode: "job_creation_failed",
        errorMessage: err instanceof Error ? err.message : "unknown",
      });
    }
  });

  // ── /status ───────────────────────────────────────────────────────
  bot.onText(/\/status\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const jobId = match![1].trim();

    const job = await getJob(jobId);
    if (!job) {
      await bot.sendMessage(chatId, `Job ${jobId} not found.`);
      return;
    }

    const statusMessages: Record<string, string> = {
      pending: "Job is waiting to be processed.",
      processing: `Job is processing. Current step: ${job.progress}`,
      complete: "Video is ready!",
      failed: `Job failed: ${job.errorMessage || "Unknown error"}`,
    };

    const message = [
      `Job: \`${job.jobId}\``,
      `Status: ${job.status}`,
      `Progress: ${job.progress}`,
      statusMessages[job.status] || "",
    ]
      .filter(Boolean)
      .join("\n");

    await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

    // If complete, try to send the video file
    if (job.status === "complete") {
      const video = await getVideo(jobId);
      if (video && video.renderStatus === "ready") {
        await bot.sendMessage(chatId, "Sending your video now...");
        const sent = await sendVideoFile(bot, chatId, jobId);
        if (!sent) {
          const videoUrl = video.videoUrl;
          if (videoUrl) {
            await bot.sendMessage(chatId, `Video is ready: ${videoUrl}`);
          } else {
            await bot.sendMessage(
              chatId,
              "Video file not found on disk. It may have been moved to cloud storage.",
            );
          }
        }
      }
    }

    logger.info("tg_status_check", {
      component: "telegram-bot",
      stage: "status_command",
      chatId,
      jobId,
      jobStatus: job.status,
    });
  });

  // ── Watch for job completions and push videos ─────────────────────
  // Poll for completed jobs every 15 seconds and send videos to waiting users
  const pendingDeliveries = new Map<string, number>(); // jobId -> chatId

  // Override: when a user creates a job, we track it for delivery
  const originalCreateMythxJob = createMythxJob;

  setInterval(async () => {
    const entries = Array.from(pendingDeliveries.entries());
    for (const [jobId, chatId] of entries) {
      const job = await getJob(jobId);
      if (!job) {
        pendingDeliveries.delete(jobId);
        continue;
      }

      if (job.status === "complete") {
        pendingDeliveries.delete(jobId);
        const video = await getVideo(jobId);
        if (video && video.renderStatus === "ready") {
          await bot.sendMessage(chatId, "Your video is ready!");
          await sendVideoFile(bot, chatId, jobId);
        } else if (video && video.renderStatus === "failed") {
          await bot.sendMessage(
            chatId,
            "Video generation failed. Please try again.",
          );
        }
        continue;
      }

      if (job.status === "failed") {
        pendingDeliveries.delete(jobId);
        await bot.sendMessage(
          chatId,
          `Job failed: ${job.errorMessage || "Unknown error"}. Please try again.`,
        );
        continue;
      }

      if (job.status === "processing") {
        // Progress update every 60s
        const jobAge = Date.now() - Date.parse(job.updatedAt);
        if (jobAge > 60_000 && jobAge % 120_000 < 30_000) {
          await bot.sendMessage(
            chatId,
            `Still working on your video... Current step: ${job.progress}`,
          );
        }
      }
    }
  }, 15_000);

  // Track jobs for delivery by wrapping command handlers
  // We use a simpler approach: store chatId on job creation via a side map
  const jobChatMap = new Map<string, number>();

  // Patch: after each job creation, track for delivery
  // We do this by intercepting the sendMessage with jobId
  const origSendMessage = bot.sendMessage.bind(bot);
  bot.sendMessage = async function (
    chatId: number,
    text: string,
    options?: any,
  ) {
    // Extract jobId from status message
    const jobIdMatch = text.match(/Video job created: `([a-f0-9-]+)`/);
    if (jobIdMatch) {
      jobChatMap.set(jobIdMatch[1], chatId);
      pendingDeliveries.set(jobIdMatch[1], chatId);
    }
    return origSendMessage(chatId, text, options);
  };

  logger.info("tg_bot_started", {
    component: "telegram-bot",
    stage: "startup",
  });

  return bot;
}

export { setupTelegramBot };
