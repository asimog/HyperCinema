import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";
import { getCrossmintViewerFromCookies } from "@/lib/crossmint/server";

export default async function FamilyCinemaPage() {
  const viewer = await getCrossmintViewerFromCookies();
  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.familycinema} viewer={viewer} />;
}

