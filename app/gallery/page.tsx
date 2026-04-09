// Gallery route - shows all completed videos with TikTok-style feed
import { db } from "@/lib/db";
import GalleryPage from "@/components/gallery/GalleryPage";

// Disable caching - always show latest videos
export const dynamic = "force-dynamic";

// Job card data shape from Prisma
interface JobCard {
  jobId: string;
  subjectName: string | null;
  sourceMediaUrl: string | null;
  videoSeconds: number | null;
  requestKind: string | null;
  videoStyle: string | null;
  wallet: string | null;
  createdAt: Date | null;
  status: string;
}

// Fetch completed jobs from Prisma
async function getAllJobs(limit: number = 100): Promise<JobCard[]> {
  try {
    const jobs = await db.job.findMany({
      where: { status: "complete" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return jobs.map(
      (job: {
        jobId: string;
        subjectName: string | null;
        sourceMediaUrl: string | null;
        videoSeconds: number | null;
        requestKind: string | null;
        stylePreset: string | null;
        wallet: string | null;
        createdAt: Date | null;
        status: string;
      }) => ({
        jobId: job.jobId,
        subjectName: job.subjectName,
        sourceMediaUrl: job.sourceMediaUrl,
        videoSeconds: job.videoSeconds,
        requestKind: job.requestKind,
        videoStyle: job.stylePreset,
        wallet: job.wallet,
        createdAt: job.createdAt,
        status: job.status,
      }),
    ) as JobCard[];
  } catch {
    return [];
  }
}

// Server component - fetches jobs and renders gallery
export default async function GalleryRoute() {
  const jobs = await getAllJobs(200);
  return <GalleryPage jobs={jobs} />;
}
