import { InterfaceCardsAgent } from "@/packages/core/src/protocol";

export function createHyperCinemaCardsAgent(baseUrl: string): InterfaceCardsAgent {
  return {
    id: "hypercinema-cards-agent",
    label: "CardsAgent",
    kind: "remotion",
    repoPath: "C:\\SessionMint\\my-video",
    entrypoint: "src/Root.tsx",
    compositions: ["CardsDeck", "HashArtPromo", "HarvestRentReclaimer"],
    textEndpoint: new URL("/api/cards-agent", baseUrl).toString(),
    renderEndpoint: new URL("/api/cards-agent/render", baseUrl).toString(),
  };
}
