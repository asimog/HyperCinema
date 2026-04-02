import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";

export default async function FamilyCinemaPage() {
  // No authentication required for FamilyCinema
  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.familycinema} viewer={null} />;
}

