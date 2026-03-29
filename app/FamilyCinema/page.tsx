import { CrossmintLoginCard } from "@/components/auth/CrossmintLoginCard";
import { CinemaGeneratorClient } from "@/components/cinema/CinemaGeneratorClient";
import { CINEMA_PAGE_CONFIGS } from "@/lib/cinema/config";
import { getCrossmintViewerFromCookies } from "@/lib/crossmint/server";

export default async function FamilyCinemaPage() {
  const viewer = await getCrossmintViewerFromCookies();

  if (!viewer) {
    return (
      <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
        <CrossmintLoginCard
          title="Login to open FamilyCinema"
          summary="FamilyCinema is the bedtime-story node. Parents log in, paste the story seed, and keep the finished gallery private."
        />
      </div>
    );
  }

  return <CinemaGeneratorClient config={CINEMA_PAGE_CONFIGS.familycinema} viewer={viewer} />;
}

