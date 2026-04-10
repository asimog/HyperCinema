// Telegram bot only — no HTTP server, no X bot
import { logger } from "@/lib/logging/logger";
import { setupTelegramBot } from "./telegram-bot";

const telegramBot = setupTelegramBot();

function gracefulShutdown(signal: string) {
  logger.info("telegram_bot_shutdown", {
    component: "telegram-bot",
    stage: "shutdown",
    signal,
  });
  if (telegramBot) {
    telegramBot.stopPolling();
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

logger.info("telegram_bot_started", {
  component: "telegram-bot",
  stage: "startup",
  bot: "@HyperMythXBot",
});
