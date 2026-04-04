import type { Metadata } from "next";
import MythXElizaGeneratorClient from "@/components/mythx/MythXElizaGeneratorClient";

export const metadata: Metadata = {
  title: "MythX - Powered by ElizaOS",
  description:
    "Autobiography from the last 42 tweets of an X profile. Powered by ElizaOS AI agents.",
};

export default function MythXPage() {
  return <MythXElizaGeneratorClient />;
}
