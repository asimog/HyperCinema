import { openRouterJson } from "@/lib/ai/openrouter";
import { logger } from "@/lib/logging/logger";
import { ReportDocument } from "@/lib/types/domain";

interface SummaryResponse {
  summary: string;
}

function clampWordCount(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }
  return `${words.slice(0, maxWords).join(" ")}...`;
}

export function buildFallbackReportSummary(
  report: Omit<ReportDocument, "summary" | "downloadUrl">,
): string {
  const personality = report.walletPersonality ?? report.styleClassification;
  const secondPersonality = report.walletSecondaryPersonality
    ? ` (${report.walletSecondaryPersonality})`
    : "";
  const narrative = report.narrativeSummary?.trim();
  const moment = report.memorableMoments?.[0] ?? report.funObservations?.[0] ?? null;
  const base = [
    `Wallet ${report.wallet} ran ${report.buyCount + report.sellCount} pump trades across ${report.pumpTokensTraded} tokens in ${report.rangeDays} day(s).`,
    `Flow summary: spent ${report.solSpent.toFixed(4)} SOL, received ${report.solReceived.toFixed(4)} SOL, estimated PnL ${report.estimatedPnlSol.toFixed(4)} SOL.`,
    `Style read: ${personality}${secondPersonality}.`,
    `Best trade: ${report.bestTrade}. Worst trade: ${report.worstTrade}.`,
    narrative
      ? `Narrative readout: ${narrative}`
      : "Narrative readout: the wallet alternated between high-conviction entries and fast rotations.",
    moment ? `Standout moment: ${moment}` : "Standout moment: volatility dictated most decision points.",
  ].join(" ");

  return clampWordCount(base, 140);
}

export async function generateReportSummary(
  report: Omit<ReportDocument, "summary" | "downloadUrl">,
): Promise<string> {
  try {
    const response = await openRouterJson<SummaryResponse>({
      temperature: 0.1,
      maxTokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You are a trading analyst. Use ONLY the JSON facts provided. Do not invent any trades, tokens, timestamps, or prices. Output strictly JSON with one key: summary.",
        },
        {
          role: "user",
          content: `Generate a concise report summary (80-140 words) from these facts:\n${JSON.stringify(
            report,
          )}`,
        },
      ],
    });

    const summary = response.summary?.trim();
    if (summary) {
      return summary;
    }
  } catch (error) {
    logger.warn("report_summary_openrouter_failed_fallback", {
      component: "ai_report",
      stage: "generate_summary",
      errorCode: "report_summary_openrouter_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return buildFallbackReportSummary(report);
}
