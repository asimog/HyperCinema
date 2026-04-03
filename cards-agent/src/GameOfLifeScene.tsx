import { MotionBackdrop } from "./MotionBackdrop";
import type { CardsDeckProps } from "./types";

export function GameOfLifeScene(props: CardsDeckProps) {
  return (
    <MotionBackdrop
      {...props}
      mode="game_of_life"
      placement="interstitial"
      kicker="Game of Life adapter"
    />
  );
}
