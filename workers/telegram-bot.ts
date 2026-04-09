// Telegram bot — free video generation for individuals and groups.
//
// Commands (DMs and groups):
//   /start               — welcome + help
//   /video @handle       — MythX: X profile → video
//   /video <address>     — HashMyth: wallet/token → video (Solana/ETH/Base/BNB)
//   /random              — Random cinema video
//   /status <jobId>      — Check job status
//
// Group admin commands:
//   /settoken <address>  — Pin a token to this group (future /random in group uses it)
//   /cleartoken          — Remove pinned token
//
// Plain text in group with pinned token:
//   "video" or "generate" — generates a video for the pinned token
//
// Rate limits (per chat):
//   Profile: 2/day · Wallet: 2/day · Random: 5/day

import TelegramBot from "node-telegram-bot-api";
import { existsSync, createReadStream } from "fs";
import { stat } from "fs/promises";
import { logger } from "@/lib/logging/logger";
import {
  createPromptVideoJob,
  createTokenVideoJob,
  getJob,
  getVideo,
} from "@/lib/jobs/repository";
import { triggerJobProcessing } from "@/lib/jobs/trigger";
import { fetchXProfileTweets } from "@/lib/x/api";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { JobDocument, SupportedTokenChain } from "@/lib/types/domain";

const APP_BASE_URL = process.env.APP_BASE_URL || "https://hypercinema.app";
const VIDEO_DIR = "/data/videos";

// ── Input detection ─────────────────────────────────────────────────

function detectInput(input: string): "mythx" | "hashmyth" | "random" {
  const t = input.trim();
  if (!t) return "random";
  if (t.startsWith("@") || /^https?:\/\/(x|twitter)\.com\//.test(t)) return "mythx";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t)) return "hashmyth";  // Solana
  if (/^0x[a-fA-F0-9]{40}$/.test(t)) return "hashmyth";             // EVM
  // Short handles without @
  if (/^[a-zA-Z][a-zA-Z0-9_]{1,14}$/.test(t)) return "mythx";
  return "mythx";
}

// ── Rate limiting ────────────────────────────────────────────────────

interface RateWindow { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateWindow>();

function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const w = rateLimitStore.get(key);
  if (!w || now > w.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  if (w.count >= max) return false;
  w.count++;
  return true;
}

// ── Group token store (in-memory, per-process) ───────────────────────

const groupTokens = new Map<number, string>(); // chatId → tokenAddress

// ── Job creation helpers ─────────────────────────────────────────────

const RANDOM_PROMPTS = [
  "The rise and fall of a forgotten memecoin, told through blockchain whispers.",
  "A whale silently moves markets at midnight. What are they planning?",
  "From penny to moon: the untold story of a Solana airdrop nobody expected.",
  "DeFi summer: one year later. A documentary.",
  "The last block before the rug pull. A cinematic thriller.",
];

async function createMythxJob(profileInput: string): Promise<JobDocument> {
  let subjectName = profileInput.startsWith("@") ? profileInput : `@${profileInput}`;
  let sourceMediaUrl: string | null = null;
  let sourceTranscript: string | null = null;

  try {
    const profile = await fetchXProfileTweets({ profileInput, maxTweets: 42 });
    subjectName = profile.profile.displayName || (profile.profile.username ? `@${profile.profile.username}` : subjectName);
    sourceMediaUrl = profile.profile.profileUrl;
    sourceTranscript = profile.transcript;
  } catch (err) {
    logger.warn("tg_mythx_profile_hydration_failed", {
      component: "telegram-bot", stage: "hydrate_mythx_profile", profileInput,
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }

  return createPromptVideoJob({
    requestKind: "mythx", packageType: "30s",
    subjectName, sourceMediaUrl, sourceMediaProvider: "x",
    sourceTranscript, paymentWaived: true, experience: "mythx",
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
    subjectName = token.name;
    subjectSymbol = token.symbol;
    subjectImage = token.image;
    subjectDescription = token.description;
    chain = token.chain;
  } catch (err) {
    logger.warn("tg_hashmyth_metadata_failed", {
      component: "telegram-bot", stage: "resolve_token", address,
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
  }

  return createTokenVideoJob({
    tokenAddress: address, packageType: "30s",
    subjectChain: chain, subjectName, subjectSymbol,
    subjectImage, subjectDescription, paymentWaived: true,
  });
}

async function createRandomJob(pinnedToken?: string): Promise<JobDocument> {
  if (pinnedToken) return createHashmythJob(pinnedToken);
  const prompt = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
  return createPromptVideoJob({
    requestKind: "generic_cinema", packageType: "30s",
    subjectName: "Random Cinema", subjectDescription: prompt,
    requestedPrompt: prompt, paymentWaived: true,
  });
}

// ── Video delivery ───────────────────────────────────────────────────

async function sendVideoFile(bot: TelegramBot, chatId: number, jobId: string): Promise<boolean> {
  const path = `${VIDEO_DIR}/${jobId}.mp4`;
  if (!existsSync(path)) return false;
  const fileStat = await stat(path);
  const thumb = existsSync(`${VIDEO_DIR}/${jobId}-thumbnail.jpg`)
    ? `${VIDEO_DIR}/${jobId}-thumbnail.jpg` : undefined;
  try {
    await bot.sendVideo(chatId, createReadStream(path), {
      caption: `Your video is ready! Watch online: ${APP_BASE_URL}/job/${jobId}`,
      thumbnail: thumb, supports_streaming: true,
    });
    logger.info("tg_video_sent", { component: "telegram-bot", jobId, chatId, sizeBytes: fileStat.size });
    return true;
  } catch (err) {
    logger.error("tg_send_video_failed", {
      component: "telegram-bot", jobId, chatId,
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}

// ── Job dispatch + delivery loop ─────────────────────────────────────

const pendingDeliveries = new Map<string, number>(); // jobId → chatId

async function dispatchAndTrack(
  bot: TelegramBot,
  chatId: number,
  job: JobDocument,
  label: string,
): Promise<void> {
  const jobUrl = `${APP_BASE_URL}/job/${job.jobId}`;

  await bot.sendMessage(
    chatId,
    `✅ *${label}* started!\n\n🔗 Track it live: ${jobUrl}\n\nI'll send your video here when it's done (usually 2-5 min).`,
    { parse_mode: "Markdown" },
  );

  pendingDeliveries.set(job.jobId, chatId);

  triggerJobProcessing(job.jobId).catch((err) => {
    logger.error("tg_trigger_failed", {
      component: "telegram-bot", jobId: job.jobId, chatId,
      errorMessage: err instanceof Error ? err.message : "unknown",
    });
  });
}

// ── Admin check ──────────────────────────────────────────────────────

async function isGroupAdmin(bot: TelegramBot, chatId: number, userId: number): Promise<boolean> {
  try {
    const member = await bot.getChatMember(chatId, userId);
    return member.status === "administrator" || member.status === "creator";
  } catch {
    return false;
  }
}

// ── Bot setup ────────────────────────────────────────────────────────

function setupTelegramBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    logger.warn("tg_bot_disabled", {
      component: "telegram-bot", stage: "startup", errorMessage: "TELEGRAM_BOT_TOKEN not set",
    });
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  // /start ────────────────────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const isGroup = msg.chat.type !== "private";
    const pinned = isGroup ? groupTokens.get(chatId) : null;

    const lines = [
      "🎬 *HyperCinema Bot* — free AI video generator",
      "",
      "Commands:",
      "  /video @username — X profile autobiography video",
      "  /video <address> — Wallet or token video (SOL · ETH · Base · BNB)",
      "  /random — Random cinema video",
      "  /status <jobId> — Check job progress",
      "",
      isGroup ? "Group admin commands:" : "",
      isGroup ? "  /settoken <address> — Pin a token to this group" : "",
      isGroup ? "  /cleartoken — Remove pinned token" : "",
      isGroup && pinned ? `\nPinned token: \`${pinned}\`` : "",
      "",
      "Rate limits: 2 profile · 2 wallet · 5 random per chat per day.",
      `\nAll videos are public: ${APP_BASE_URL}/autonomous`,
      "\nAlso on X: @HyperMythsX — https://x.com/HyperMythX",
    ].filter((l) => l !== "");

    await bot.sendMessage(chatId, lines.join("\n"), { parse_mode: "Markdown" });
  });

  // /video <input> ────────────────────────────────────────────────────
  bot.onText(/\/video\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match![1].trim();
    const type = detectInput(input);

    if (type === "mythx") {
      if (!checkRateLimit(`tg:profile:${chatId}`, 2)) {
        await bot.sendMessage(chatId, "⏳ Rate limit: 2 profile videos per day. Try again tomorrow.");
        return;
      }
      await bot.sendMessage(chatId, `🎬 Generating autobiography for *${input}*...`, { parse_mode: "Markdown" });
      try {
        const job = await createMythxJob(input);
        await dispatchAndTrack(bot, chatId, job, `MythX — ${input}`);
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Failed: ${err instanceof Error ? err.message : "unknown error"}`);
      }

    } else {
      if (!checkRateLimit(`tg:wallet:${chatId}`, 2)) {
        await bot.sendMessage(chatId, "⏳ Rate limit: 2 wallet videos per day. Try again tomorrow.");
        return;
      }
      await bot.sendMessage(chatId, `📊 Scanning \`${input.slice(0, 20)}...\` and generating video...`, { parse_mode: "Markdown" });
      try {
        const job = await createHashmythJob(input);
        await dispatchAndTrack(bot, chatId, job, `HashMyth — ${input.slice(0, 12)}...`);
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Failed: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }
  });

  // /random ───────────────────────────────────────────────────────────
  bot.onText(/\/random/, async (msg) => {
    const chatId = msg.chat.id;
    if (!checkRateLimit(`tg:random:${chatId}`, 5)) {
      await bot.sendMessage(chatId, "⏳ Rate limit: 5 random videos per day. Try again tomorrow.");
      return;
    }
    const pinned = groupTokens.get(chatId);
    const label = pinned ? `token ${pinned.slice(0, 8)}...` : "random cinema";
    await bot.sendMessage(chatId, `🎲 Generating ${label} video...`);
    try {
      const job = await createRandomJob(pinned);
      await dispatchAndTrack(bot, chatId, job, `Random — ${label}`);
    } catch (err) {
      await bot.sendMessage(chatId, `❌ Failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  });

  // /settoken <address> — group admin only ────────────────────────────
  bot.onText(/\/settoken\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (msg.chat.type === "private") {
      await bot.sendMessage(chatId, "/settoken is for group chats only.");
      return;
    }
    if (!userId || !(await isGroupAdmin(bot, chatId, userId))) {
      await bot.sendMessage(chatId, "⛔ Only group admins can set the pinned token.");
      return;
    }
    const address = match![1].trim();
    const type = detectInput(address);
    if (type !== "hashmyth") {
      await bot.sendMessage(chatId, "❌ That doesn't look like a valid wallet/token address.");
      return;
    }
    groupTokens.set(chatId, address);
    await bot.sendMessage(chatId, `✅ Pinned token set: \`${address}\`\n\nNow /random will generate videos for this token.`, { parse_mode: "Markdown" });
    logger.info("tg_group_token_set", { component: "telegram-bot", chatId, address });
  });

  // /cleartoken ───────────────────────────────────────────────────────
  bot.onText(/\/cleartoken/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (msg.chat.type === "private") { await bot.sendMessage(chatId, "/cleartoken is for groups only."); return; }
    if (!userId || !(await isGroupAdmin(bot, chatId, userId))) {
      await bot.sendMessage(chatId, "⛔ Only group admins can clear the pinned token."); return;
    }
    groupTokens.delete(chatId);
    await bot.sendMessage(chatId, "✅ Pinned token cleared. /random will now generate truly random videos.");
  });

  // /status <jobId> ───────────────────────────────────────────────────
  bot.onText(/\/status\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const jobId = match![1].trim();
    const job = await getJob(jobId);
    if (!job) { await bot.sendMessage(chatId, `Job \`${jobId}\` not found.`, { parse_mode: "Markdown" }); return; }

    const statusLine = job.status === "complete"
      ? "✅ Ready!"
      : job.status === "failed"
        ? `❌ Failed: ${(job as unknown as Record<string, string>).errorMessage ?? "unknown"}`
        : `⏳ ${job.status} — ${job.progress ?? "working..."}`;

    await bot.sendMessage(
      chatId,
      `*Job* \`${jobId}\`\n${statusLine}\n🔗 ${APP_BASE_URL}/job/${jobId}`,
      { parse_mode: "Markdown" },
    );

    if (job.status === "complete") {
      const video = await getVideo(jobId);
      if (video?.renderStatus === "ready") {
        const sent = await sendVideoFile(bot, chatId, jobId);
        if (!sent && video.videoUrl) {
          await bot.sendMessage(chatId, `📹 Video: ${video.videoUrl}`);
        }
      }
    }
  });

  // Plain text trigger: "video" or "generate" in group with pinned token ──
  bot.on("message", async (msg) => {
    if (!msg.text || msg.chat.type === "private") return;
    if (msg.text.startsWith("/")) return; // handled above
    const chatId = msg.chat.id;
    const pinned = groupTokens.get(chatId);
    if (!pinned) return;

    const trigger = msg.text.toLowerCase().trim();
    if (trigger === "video" || trigger === "generate" || trigger === "gen") {
      if (!checkRateLimit(`tg:random:${chatId}`, 5)) {
        await bot.sendMessage(chatId, "⏳ Rate limit reached. Try again tomorrow.");
        return;
      }
      await bot.sendMessage(chatId, `📊 Generating video for pinned token \`${pinned.slice(0, 8)}...\``, { parse_mode: "Markdown" });
      try {
        const job = await createHashmythJob(pinned);
        await dispatchAndTrack(bot, chatId, job, `Token video — ${pinned.slice(0, 10)}...`);
      } catch (err) {
        await bot.sendMessage(chatId, `❌ Failed: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }
  });

  // Delivery poll ──────────────────────────────────────────────────────
  setInterval(async () => {
    const entries = Array.from(pendingDeliveries.entries());
    for (const [jobId, chatId] of entries) {
      try {
        const job = await getJob(jobId);
        if (!job) { pendingDeliveries.delete(jobId); continue; }

        if (job.status === "complete") {
          pendingDeliveries.delete(jobId);
          const video = await getVideo(jobId);
          if (video?.renderStatus === "ready") {
            const sent = await sendVideoFile(bot, chatId, jobId);
            if (!sent) {
              const url = video.videoUrl || `${APP_BASE_URL}/job/${jobId}`;
              await bot.sendMessage(chatId, `🎬 Your video is ready!\n\n📹 Watch: ${url}`);
            }
          } else {
            await bot.sendMessage(chatId, `🎬 Job complete! Watch: ${APP_BASE_URL}/job/${jobId}`);
          }
        } else if (job.status === "failed") {
          pendingDeliveries.delete(jobId);
          await bot.sendMessage(chatId, `❌ Video generation failed. Try again: ${APP_BASE_URL}`);
        }
      } catch (err) {
        logger.error("tg_delivery_poll_error", {
          component: "telegram-bot", jobId, errorMessage: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }, 15_000);

  logger.info("tg_bot_started", { component: "telegram-bot", stage: "startup" });
  return bot;
}

export { setupTelegramBot };
