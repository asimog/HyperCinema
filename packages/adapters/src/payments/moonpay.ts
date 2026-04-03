import { InterfacePaymentAdapter } from "@/packages/core/src/protocol";

export function createHyperCinemaMoonpayAdapter(baseUrl: string): InterfacePaymentAdapter {
  return {
    id: "hypercinema-moonpay",
    label: "MoonPay Commerce",
    kind: "hosted_checkout",
    currency: "SOL",
    network: "solana",
    endpoint: new URL("/api/jobs", baseUrl).toString(),
  };
}
