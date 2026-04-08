import { ACTIVE_PACKAGE_TYPES, PACKAGE_CONFIG } from "@/lib/constants";
import { TOKEN_VIDEO_STYLE_PRESETS } from "@/lib/memecoins/styles";
import { InterfaceAdapterServiceManifest } from "@/packages/core/src/protocol";

export const publicHyperCinemaServiceManifest: InterfaceAdapterServiceManifest = {
  id: "hypercinema.multichain-memecoin-video",
  name: "TrenchMyths",
  summary:
    "HyperMyths memecoin video generation from one mint or contract address, packaged for direct UI use, manual SOL checkout, x402 agent calls, or CardsAgent text decks, title pages, and motion adapters.",
  primaryMode: "token_video",
  supportedChains: ["solana", "ethereum", "bsc", "base"],
  inputSchema: {
    addressField: "tokenAddress",
    chainField: "chain",
    promptField: "requestedPrompt",
    styleField: "stylePreset",
  },
  packages: ACTIVE_PACKAGE_TYPES.map((packageType) => ({
    packageType,
    label: PACKAGE_CONFIG[packageType].label ?? packageType,
    durationSeconds: PACKAGE_CONFIG[packageType].videoSeconds,
    priceSol: PACKAGE_CONFIG[packageType].priceSol,
    priceUsdc: PACKAGE_CONFIG[packageType].priceUsdc,
  })),
  styles: TOKEN_VIDEO_STYLE_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    summary: preset.summary,
  })),
  adapters: [
    {
      id: "hypercinema-manual-sol",
      label: "Manual SOL",
      kind: "manual",
      currency: "SOL",
      network: "solana",
      endpoint: "/api/jobs",
    },
    {
      id: "hypercinema-x402",
      label: "x402 / USDC",
      kind: "x402",
      currency: "USDC",
      network: "solana",
      endpoint: "/api/x402/video",
    },
  ],
  cardsAgent: {
    id: "hypercinema-cards-agent",
    label: "CardsAgent",
    kind: "remotion",
    repoPath: "C:\\SessionMint\\my-video",
    entrypoint: "src/Root.tsx",
    requestField: "requestedComposition",
    compositions: [
      {
        id: "cards",
        label: "Cards Deck",
        kind: "cards",
        summary: "Readable slide deck for notes, story beats, and director handoff.",
        placements: ["main_card", "interstitial", "transition"],
      },
      {
        id: "game_of_life",
        label: "Game of Life",
        kind: "game_of_life",
        summary:
          "Cellular automaton adapter for title pages, transitional motion, and living end cards.",
        placements: ["title_page", "end_page", "interstitial", "transition"],
      },
      {
        id: "three_js",
        label: "Three.js Stage",
        kind: "three_js",
        summary:
          "Three.js adapter for cinematic title cards, polish passes, and animated closing frames.",
        placements: ["title_page", "end_page", "main_card", "transition"],
      },
    ],
    proposals: [
      {
        target: "title_page",
        adapterId: "three_js",
        label: "Opening statement",
        reason: "Use Three.js for the title page when the director wants a heavier cinematic read.",
      },
      {
        target: "end_page",
        adapterId: "game_of_life",
        label: "Living outro",
        reason: "Use Game of Life for end pages, pauses, and reflective motion between acts.",
      },
      {
        target: "interstitial",
        adapterId: "game_of_life",
        label: "Pacing reset",
        reason: "Use Game of Life as a bridge between cards when the story needs a breathing room.",
      },
      {
        target: "main_card",
        adapterId: "cards",
        label: "Readable deck",
        reason: "Use the standard deck whenever the director needs structured text and notes.",
      },
    ],
    textEndpoint: "/api/cards-agent",
    renderEndpoint: "/api/cards-agent/render",
  },
  endpoints: {
    createJob: "/api/jobs",
    x402: "/api/x402/video",
    statusTemplate: "/api/jobs/{jobId}",
    manifest: "/api/service",
  },
};
