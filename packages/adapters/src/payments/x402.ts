import { InterfacePaymentAdapter } from "@/packages/core/src/protocol";

export function createHyperCinemaX402Adapter(baseUrl: string): InterfacePaymentAdapter {
  return {
    id: "hypercinema-x402",
    label: "x402 / USDC",
    kind: "x402",
    currency: "USDC",
    network: "solana",
    endpoint: new URL("/api/x402/video", baseUrl).toString(),
  };
}
