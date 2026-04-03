import { MotionBackdrop } from "./MotionBackdrop";
import type { CardsDeckProps } from "./types";

export function EndPage(props: CardsDeckProps) {
  return (
    <MotionBackdrop
      {...props}
      mode="game_of_life"
      placement="end_page"
      kicker="End page proposal"
    />
  );
}
