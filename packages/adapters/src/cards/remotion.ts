import { InterfaceCardsAgent } from "@/packages/core/src/protocol";

export function createHyperCinemaCardsAgent(baseUrl: string): InterfaceCardsAgent {
  return {
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
    textEndpoint: new URL("/api/cards-agent", baseUrl).toString(),
    renderEndpoint: new URL("/api/cards-agent/render", baseUrl).toString(),
  };
}
