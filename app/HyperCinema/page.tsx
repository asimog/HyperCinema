import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";

export default function HyperCinemaPage() {
  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.hypercinema} viewer={null} />;
}

