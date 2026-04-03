import { Composition } from "remotion";
import type { ComponentType } from "react";

import { CardsDeck } from "./CardsDeck";

export function CardsAgentRoot() {
  return (
    <>
      <Composition
        id="CardsDeck"
        component={CardsDeck as unknown as ComponentType<Record<string, unknown>>}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          title: "CardsAgent",
          subtitle: "Remotion-backed text cards for HyperCinema.",
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
        }}
      />
    </>
  );
}
