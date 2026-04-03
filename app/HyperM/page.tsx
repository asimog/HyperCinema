import type { Metadata } from "next";

import { HyperMGeneratorClient } from "@/components/hyperm/HyperMGeneratorClient";

export const metadata: Metadata = {
  title: "HyperM",
  description:
    "Autobiography generator that turns the last 10 tweets from an X profile into a full-bore cinematic cut.",
};

export default function HyperMPage() {
  return <HyperMGeneratorClient />;
}
