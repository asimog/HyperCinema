import type { Metadata } from "next";
import { HashMythPage } from "@/components/hashmyth/HashMythScanner";

export const metadata: Metadata = {
  title: "HashMyth - Token Scanner",
  description:
    "Scan any token or wallet. AI analyzes risk, metadata, and recommends the perfect cinematic style.",
};

export default function HashMythRoute() {
  return <HashMythPage />;
}
