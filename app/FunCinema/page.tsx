import { CrossmintLoginCard } from "@/components/auth/CrossmintLoginCard";
import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";
import { getCrossmintViewerFromCookies } from "@/lib/crossmint/server";

export default async function FunCinemaPage() {
  const viewer = await getCrossmintViewerFromCookies();

  if (!viewer) {
    return (
      <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
        <CrossmintLoginCard
          title="Login to open FunCinema"
          summary="FunCinema is the private sandbox node. Login is required before the private gallery and private pricing become available."
        />
      </div>
    );
  }

  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.funcinema} viewer={viewer} />;
}

