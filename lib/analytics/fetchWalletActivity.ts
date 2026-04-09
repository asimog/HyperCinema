// Helius integration removed - wallet activity fetching will use alternative data sources
import type { EnhancedTransaction } from "helius-sdk/enhanced/types";
import { AnalysisRangeHours } from "./types";

export async function fetchWalletActivity(input: {
  wallet: string;
  rangeHours: AnalysisRangeHours;
}): Promise<EnhancedTransaction[]> {
  // Helius integration removed; return empty array until alternative data source is configured
  return [];
}
