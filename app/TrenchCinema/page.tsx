import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";

export default function TrenchCinemaPage() {
  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.trenchcinema} viewer={null} />;
}

