import type { Metadata } from "next";

import { HyperMGeneratorClient } from "@/components/hyperm/HyperMGeneratorClient";

export const metadata: Metadata = {
  title: "MythX",
  description:
    "Autobiography from the last 42 tweets of an X profile. No title required, just a handle or bio link.",
};

export default function MythXPage() {
  return <HyperMGeneratorClient />;
}
