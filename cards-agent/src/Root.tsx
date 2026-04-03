import { Composition } from "remotion";
import type { ComponentType } from "react";

import { CardsDeck } from "./CardsDeck";
import { EndPage } from "./EndPage";
import { GameOfLifeScene } from "./GameOfLifeScene";
import { ThreeScene } from "./ThreeScene";
import { TitlePage } from "./TitlePage";

const defaultDeck = {
  title: "CardsAgent",
  subtitle: "Remotion-backed text cards and video adapters for HyperCinema.",
  requestedComposition: null,
  cards: [
    {
      id: "hook",
      phase: "hook",
      title: "Hook / Outline",
      teaser: "Open with a clear, readable problem statement.",
      visualCue: "Use the first frame to establish the world and the tone.",
      narrationCue: "State the point quickly and without excess.",
      transitionLabel: "Break in",
    },
    {
      id: "build",
      phase: "build",
      title: "Build / Structure",
      teaser: "Let the middle tighten rather than sprawl.",
      visualCue: "Increase motion, scale, or contrast as the idea sharpens.",
      narrationCue: "Add only the words that move the idea forward.",
      transitionLabel: "Push harder",
    },
    {
      id: "payoff",
      phase: "payoff",
      title: "Payoff / Finish",
      teaser: "Land on a repeatable final line or frame.",
      visualCue: "Treat the ending like a poster and a signature.",
      narrationCue: "Close cleanly so the deck can be reused or extended.",
      transitionLabel: "Stick the landing",
    },
    {
      id: "continuation",
      phase: "continuation",
      title: "Next Step / Sequel",
      teaser: "Leave room for the next card, next prompt, or next chapter.",
      visualCue: "Leave the last image open enough to branch cleanly.",
      narrationCue: "Make the continuation easy to pick up later.",
      transitionLabel: "Queue sequel",
    },
  ],
  visualAdapters: [
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
      reason: "Use Game of Life as a bridge between cards when the story needs breathing room.",
    },
    {
      target: "main_card",
      adapterId: "cards",
      label: "Readable deck",
      reason: "Use the standard deck whenever the director needs structured text and notes.",
    },
  ],
};

export function CardsAgentRoot() {
  return (
    <>
      <Composition
        id="cards"
        component={CardsDeck as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultDeck}
      />
      <Composition
        id="game_of_life"
        component={GameOfLifeScene as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultDeck}
      />
      <Composition
        id="three_js"
        component={ThreeScene as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultDeck}
      />
      <Composition
        id="title_page"
        component={TitlePage as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultDeck}
      />
      <Composition
        id="end_page"
        component={EndPage as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
        defaultProps={defaultDeck}
      />
    </>
  );
}
