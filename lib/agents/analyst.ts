import { fetchXProfileTweets } from "@/lib/x/api";
import { resolveMemecoinMetadata } from "@/lib/memecoins/metadata";
import { generateTextInference } from "@/lib/inference/text";
import { logger } from "@/lib/logging/logger";
import { getEnv } from "@/lib/env";

// ── Types ──────────────────────────────────────────────────

export type AnalystReportType = "mythx" | "wallet" | "coin" | "random";

export interface AnalystReport {
  type: AnalystReportType;
  sourceData: string;
  summary: string;
  keyThemes: string[];
  entities: string[];
  mood: string;
}

interface AnalysisPrompt {
  system: string;
  user: string;
}

// ── Constants ──────────────────────────────────────────────

const ANALYST_SYSTEM_PROMPT = `You are an elite data analyst for HyperCinema, an AI-powered cinematic video generation platform.
Your job is to analyze raw data from various sources and extract structured insights that will be used to create compelling narratives.

Always respond with concise, actionable analysis. Focus on:
- Key themes and patterns
- Notable entities (names, tokens, addresses, concepts)
- Overall mood and tone
- A brief summary that captures the essence of the data`;

// ── Analyst Functions ──────────────────────────────────────

/**
 * Fetches and analyzes an X (Twitter) profile's recent activity.
 * Returns structured profile data with tweet transcript.
 */
export async function analyzeXProfile(username: string): Promise<{
  profile: {
    displayName: string;
    username: string;
    profileUrl: string;
    description: string | null;
    profileImageUrl: string | null;
  };
  tweets: Array<{ id: string; text: string; createdAt: string | null }>;
  transcript: string;
}> {
  const env = getEnv();
  logger.info("analyst_fetching_x_profile", {
    component: "agents_analyst",
    stage: "analyzeXProfile",
    username,
  });

  const result = await fetchXProfileTweets({
    profileInput: username,
    maxTweets: 16,
  });

  logger.info("analyst_x_profile_fetched", {
    component: "agents_analyst",
    stage: "analyzeXProfile",
    username: result.profile.username,
    tweetCount: result.tweets.length,
  });

  return result;
}

/**
 * Placeholder for wallet analysis.
 * Returns mock/empty data since Helius is removed.
 */
export async function analyzeWallet(wallet: string): Promise<{
  wallet: string;
  activitySummary: string;
  transactions: Array<Record<string, unknown>>;
}> {
  logger.info("analyst_wallet_analysis_placeholder", {
    component: "agents_analyst",
    stage: "analyzeWallet",
    wallet,
  });

  return {
    wallet,
    activitySummary:
      "Wallet activity data source is currently unavailable. Alternative data sources are being configured.",
    transactions: [],
  };
}

/**
 * Fetches coin metadata from pump.fun / four.meme / clanker.world APIs.
 */
export async function analyzeMemecoin(
  address: string,
  chain: string,
): Promise<{
  address: string;
  chain: string;
  name: string;
  symbol: string;
  image: string | null;
  description: string | null;
  isPump: boolean;
  marketSnapshot: Record<string, unknown>;
}> {
  logger.info("analyst_fetching_memecoin", {
    component: "agents_analyst",
    stage: "analyzeMemecoin",
    address,
    chain,
  });

  try {
    const metadata = await resolveMemecoinMetadata({
      address,
      chain: chain as "solana" | "ethereum" | "bsc" | "base" | "auto",
    });

    return {
      address: metadata.address,
      chain: metadata.chain,
      name: metadata.name,
      symbol: metadata.symbol,
      image: metadata.image,
      description: metadata.description,
      isPump: metadata.isPump,
      marketSnapshot: metadata.marketSnapshot as unknown as Record<
        string,
        unknown
      >,
    };
  } catch (error) {
    logger.warn("analyst_memecoin_fetch_failed", {
      component: "agents_analyst",
      stage: "analyzeMemecoin",
      address,
      chain,
      errorCode: "memecoin_fetch_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      address,
      chain,
      name: `Token ${address.slice(0, 8)}`,
      symbol: "UNKNOWN",
      image: null,
      description: null,
      isPump: false,
      marketSnapshot: {},
    };
  }
}

// ── Analysis Helpers ───────────────────────────────────────

function buildMythXAnalysisPrompt(
  transcript: string,
  profileInfo: string,
): AnalysisPrompt {
  return {
    system: ANALYST_SYSTEM_PROMPT,
    user: `Analyze this X profile data and extract insights for cinematic narrative generation.

Profile Info: ${profileInfo}

Tweet Transcript (last 16 tweets):
${transcript}

Return your analysis in this exact JSON format:
{
  "summary": "A 2-3 sentence summary of the profile's content and themes",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "entities": ["name1", "name2", "token1"],
  "mood": "The overall mood/tone detected (e.g., bullish, reflective, chaotic, triumphant)"
}`,
  };
}

function buildWalletAnalysisPrompt(
  activitySummary: string,
  wallet: string,
): AnalysisPrompt {
  return {
    system: ANALYST_SYSTEM_PROMPT,
    user: `Analyze this wallet activity summary for cinematic narrative generation.

Wallet: ${wallet}
Activity Summary: ${activitySummary}

Return your analysis in this exact JSON format:
{
  "summary": "A 2-3 sentence summary of the wallet's activity patterns",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "entities": ["token1", "concept1"],
  "mood": "The overall mood/tone detected (e.g., aggressive, cautious, lucky, reckless)"
}`,
  };
}

function buildCoinAnalysisPrompt(coinData: string): AnalysisPrompt {
  return {
    system: ANALYST_SYSTEM_PROMPT,
    user: `Analyze this memecoin metadata for cinematic narrative generation.

Coin Data: ${coinData}

Return your analysis in this exact JSON format:
{
  "summary": "A 2-3 sentence summary of the coin's story and potential",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "entities": ["name1", "concept1"],
  "mood": "The overall mood/tone detected (e.g., hype, community-driven, speculative, meme-worthy)"
}`,
  };
}

function buildRandomAnalysisPrompt(input: string): AnalysisPrompt {
  return {
    system: ANALYST_SYSTEM_PROMPT,
    user: `Analyze this input data for cinematic narrative generation.

Input: ${input}

Return your analysis in this exact JSON format:
{
  "summary": "A 2-3 sentence summary of the input",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "entities": ["entity1", "entity2"],
  "mood": "The overall mood/tone detected"
}`,
  };
}

async function runAnalysis(prompt: AnalysisPrompt): Promise<{
  summary: string;
  keyThemes: string[];
  entities: string[];
  mood: string;
}> {
  const content = await generateTextInference({
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    temperature: 0.3,
    maxTokens: 600,
  });

  // Extract JSON from response
  const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const jsonText = codeBlockMatch?.[1]?.trim() ?? content;
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in analyst model response");
  }

  const parsed = JSON.parse(jsonText.slice(start, end + 1));
  return {
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary
        : "No summary available.",
    keyThemes: Array.isArray(parsed.keyThemes) ? parsed.keyThemes : [],
    entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    mood: typeof parsed.mood === "string" ? parsed.mood : "neutral",
  };
}

/**
 * Main entry point — gathers context from the appropriate source
 * and returns a structured AnalystReport.
 */
export async function gatherContext(
  input: string,
  type: AnalystReportType,
): Promise<AnalystReport> {
  logger.info("analyst_gathering_context", {
    component: "agents_analyst",
    stage: "gatherContext",
    type,
    inputPreview: input.slice(0, 100),
  });

  let sourceData = "";
  let analysisPrompt: AnalysisPrompt;

  switch (type) {
    case "mythx": {
      const profileData = await analyzeXProfile(input);
      sourceData = profileData.transcript;
      analysisPrompt = buildMythXAnalysisPrompt(
        profileData.transcript,
        JSON.stringify(profileData.profile),
      );
      break;
    }

    case "wallet": {
      const walletData = await analyzeWallet(input);
      sourceData = walletData.activitySummary;
      analysisPrompt = buildWalletAnalysisPrompt(
        walletData.activitySummary,
        walletData.wallet,
      );
      break;
    }

    case "coin": {
      const parts = input.split(":");
      const address = parts[0] ?? input;
      const chain = parts[1] ?? "solana";
      const coinData = await analyzeMemecoin(address, chain);
      sourceData = JSON.stringify(coinData);
      analysisPrompt = buildCoinAnalysisPrompt(sourceData);
      break;
    }

    case "random":
    default: {
      sourceData = input;
      analysisPrompt = buildRandomAnalysisPrompt(input);
      break;
    }
  }

  const analysis = await runAnalysis(analysisPrompt);

  const report: AnalystReport = {
    type,
    sourceData,
    summary: analysis.summary,
    keyThemes: analysis.keyThemes,
    entities: analysis.entities,
    mood: analysis.mood,
  };

  logger.info("analyst_report_generated", {
    component: "agents_analyst",
    stage: "gatherContext",
    type,
    themeCount: report.keyThemes.length,
    entityCount: report.entities.length,
    mood: report.mood,
  });

  return report;
}
