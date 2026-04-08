// MythX page config
import type { Metadata } from "next";
import MythXGeneratorClient from "@/components/mythx/MythXGeneratorClient";

// SEO metadata for search engines
export const metadata: Metadata = {
  title: "MythX - Autobiographical Cinema",
  description: "Autobiography from the last 42 tweets of an X profile. Powered by MythX AI agents.",
};

// Render MythX generator component
export default function MythXPage() {
  return <MythXGeneratorClient />;
}
