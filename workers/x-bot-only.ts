// X bot only — no HTTP server, no Telegram bot
import { logger } from "@/lib/logging/logger";
import { startXBotPolling } from "./x-bot";

const xBotInterval = startXBotPolling();

function gracefulShutdown(signal: string) {
  logger.info("x_bot_shutdown", {
    component: "x-bot",
    stage: "shutdown",
    signal,
  });
  if (xBotInterval) {
    clearInterval(xBotInterval);
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

logger.info("x_bot_started", {
  component: "x-bot",
  stage: "startup",
  bot: "@HyperMythsX",
});
