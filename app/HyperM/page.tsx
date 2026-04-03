import type { Metadata } from "next";

import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";

export const metadata: Metadata = {
  title: "HyperM",
  description:
    "Full-fledged creator for polished concept cuts, brand stories, and tightly controlled outputs.",
};

export default function HyperMPage() {
  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.hyperm} viewer={null} />;
}
