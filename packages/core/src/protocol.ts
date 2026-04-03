import { SupportedTokenChain, VideoStyleId } from "@/lib/types/domain";

export interface InterfacePaymentAdapter {
  id: string;
  label: string;
  kind: "manual" | "x402" | "hosted_checkout";
  currency: "SOL" | "USDC";
  network: "solana";
  endpoint: string;
}

export interface InterfaceCardsAgentComposition {
  id: string;
  label: string;
  kind: "cards" | "game_of_life" | "three_js";
  summary: string;
  placements: Array<"main_card" | "title_page" | "end_page" | "interstitial" | "transition">;
}

export interface InterfaceCardsAgentProposal {
  target: "main_card" | "title_page" | "end_page" | "interstitial" | "transition";
  adapterId: string;
  label: string;
  reason: string;
}

export interface InterfaceCardsAgent {
  id: string;
  label: string;
  kind: "remotion";
  repoPath: string;
  entrypoint: string;
  requestField: "requestedComposition";
  compositions: InterfaceCardsAgentComposition[];
  proposals: InterfaceCardsAgentProposal[];
  textEndpoint: string;
  renderEndpoint: string;
}

export interface InterfacePackageQuote {
  packageType: "1d" | "2d";
  label: string;
  durationSeconds: number;
  priceSol: number;
  priceUsdc: number;
}

export interface InterfaceStyleOption {
  id: VideoStyleId;
  label: string;
  summary: string;
}

export interface InterfaceAdapterServiceManifest {
  id: string;
  name: string;
  summary: string;
  primaryMode: "token_video";
  supportedChains: SupportedTokenChain[];
  inputSchema: {
    addressField: "tokenAddress";
    chainField: "chain";
    promptField: "requestedPrompt";
    styleField: "stylePreset";
  };
  packages: InterfacePackageQuote[];
  styles: InterfaceStyleOption[];
  adapters: InterfacePaymentAdapter[];
  cardsAgent: InterfaceCardsAgent;
  endpoints: {
    createJob: string;
    x402: string;
    statusTemplate: string;
    manifest: string;
  };
}
