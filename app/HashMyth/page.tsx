import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";

export default function HashMythPage() {
  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.hashmyth} viewer={null} />;
}
