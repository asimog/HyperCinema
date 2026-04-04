import { getDb } from "@/lib/firebase/admin";
import GalleryPage from "@/components/gallery/GalleryPage";

export const dynamic = "force-dynamic";

interface JobCard {
  jobId: string;
  subjectName: string | null;
  sourceMediaUrl: string | null;
  videoSeconds: number | null;
  requestKind: string | null;
  videoStyle: string | null;
  wallet: string | null;
  completedAt: any;
  status: string;
}

async function getAllJobs(limit: number = 100): Promise<JobCard[]> {
  try {
    const db = getDb();
    const snapshot = await db
      .collection("jobs")
      .where("status", "==", "complete")
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      jobId: doc.id,
      ...doc.data(),
    })) as JobCard[];
  } catch {
    return [];
  }
}

export default async function GalleryRoute() {
  const jobs = await getAllJobs(100);
  return <GalleryPage jobs={jobs} />;
}
