import { MotionBackdrop } from "./MotionBackdrop";
import type { CardsDeckProps } from "./types";

export function TitlePage(props: CardsDeckProps) {
  return (
    <MotionBackdrop
      {...props}
      mode="three_js"
      placement="title_page"
      kicker="Title page proposal"
    />
  );
}
