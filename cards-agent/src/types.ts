export type CardsAgentPlacement =
  | "main_card"
  | "title_page"
  | "end_page"
  | "interstitial"
  | "transition";

export type CardsAgentCompositionKind = "cards" | "game_of_life" | "three_js";
export type CardsAgentRequestedComposition =
  | "cards"
  | "title_page"
  | "end_page"
  | "game_of_life"
  | "three_js";

export interface CardsAgentStoryCard {
  id: string;
  phase: "hook" | "build" | "payoff" | "continuation";
  title: string;
  teaser: string;
  visualCue: string;
  narrationCue: string;
  transitionLabel: string;
}

export interface CardsAgentVisualAdapter {
  id: string;
  label: string;
  kind: CardsAgentCompositionKind;
  summary: string;
  placements: CardsAgentPlacement[];
}

export interface CardsAgentProposal {
  target: CardsAgentPlacement;
  adapterId: string;
  label: string;
  reason: string;
}

export interface CardsDeckProps {
  title: string;
  subtitle: string;
  requestedComposition: CardsAgentRequestedComposition | null;
  cards: CardsAgentStoryCard[];
  visualAdapters: CardsAgentVisualAdapter[];
  proposals: CardsAgentProposal[];
}
