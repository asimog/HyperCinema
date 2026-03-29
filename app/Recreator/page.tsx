import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";

export default function RecreatorPage() {
  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.recreator} viewer={null} />;
}
