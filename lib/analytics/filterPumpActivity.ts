// Pump activity filter — stub (pump module removed)
import { PumpTradeLike } from "./types";

export async function filterPumpActivity(_input: {
  wallet: string;
  transactions: unknown[];
}): Promise<PumpTradeLike[]> {
  return [];
}
