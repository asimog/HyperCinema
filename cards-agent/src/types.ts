export interface CardsAgentStoryCard {
  id: string;
  phase: "hook" | "build" | "payoff" | "continuation";
  title: string;
  teaser: string;
  visualCue: string;
  narrationCue: string;
  transitionLabel: string;
}

export interface CardsDeckProps {
  title: string;
  subtitle: string;
  cards: CardsAgentStoryCard[];
}
