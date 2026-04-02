import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";

export default async function FunCinemaPage() {
  // No authentication required for FunCinema
  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.funcinema} viewer={null} />;
}

