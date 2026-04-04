import Link from "next/link";
import { getDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

interface GalleryVideo {
  jobId: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number;
  renderStatus: string;
  profile?: {
    username: string;
    displayName: string;
    profileUrl: string;
  };
  style?: string;
  scenes?: number;
  source?: string;
  subjectName?: string;
  requestKind?: string;
  createdAt?: Timestamp;
  completedAt?: Timestamp;
}

async function getAllGalleryVideos(limit: number = 50): Promise<GalleryVideo[]> {
  const db = getDb();

  // Get videos from the videos collection (MythXEliza + new sources)
  const videosSnapshot = await db
    .collection("videos")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const videos = videosSnapshot.docs.map((doc) => ({
    ...doc.data(),
    jobId: doc.id,
  })) as GalleryVideo[];

  // Also get jobs that have videos but might not be in videos collection yet
  const jobsSnapshot = await db
    .collection("jobs")
    .where("status", "==", "complete")
    .orderBy("completedAt", "desc")
    .limit(limit)
    .get();

  const jobVideos = jobsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      jobId: doc.id,
      videoUrl: data.videoUrl || null,
      thumbnailUrl: data.thumbnailUrl || null,
      duration: data.videoSeconds || 0,
      renderStatus: "ready",
      subjectName: data.subjectName || null,
      requestKind: data.requestKind || "unknown",
      style: data.videoStyle || null,
      createdAt: data.createdAt || null,
      completedAt: data.completedAt || null,
      source: data.source || "job",
    } as GalleryVideo;
  });

  // Merge and deduplicate by jobId
  const allVideos = [...videos];
  const existingIds = new Set(videos.map((v) => v.jobId));

  for (const jobVideo of jobVideos) {
    if (!existingIds.has(jobVideo.jobId)) {
      allVideos.push(jobVideo);
      existingIds.add(jobVideo.jobId);
    }
  }

  // Sort by creation time (newest first)
  allVideos.sort((a, b) => {
    const timeA = a.createdAt?.toMillis() || a.completedAt?.toMillis() || 0;
    const timeB = b.createdAt?.toMillis() || b.completedAt?.toMillis() || 0;
    return timeB - timeA;
  });

  return allVideos.slice(0, limit);
}

function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || "";
  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function getVideoTitle(video: GalleryVideo): string {
  if (video.profile?.displayName) {
    return video.profile.displayName;
  }
  if (video.subjectName) {
    return video.subjectName;
  }
  if (video.profile?.username) {
    return `@${video.profile.username}`;
  }
  return "MythX Video";
}

function getVideoSubtitle(video: GalleryVideo): string {
  const parts: string[] = [];

  if (video.profile?.username) {
    parts.push(`@${video.profile.username}`);
  }

  if (video.style) {
    const styleLabels: Record<string, string> = {
      vhs_cinema: "VHS Cinema",
      black_and_white_noir: "B&W Noir",
      hyperflow_assembly: "Hyperflow",
      double_exposure: "Double Exposure",
      glitch_digital: "Glitch Digital",
      found_footage_raw: "Found Footage",
      split_screen_diptych: "Split Screen",
      film_grain_70s: "70s Film Grain",
    };
    parts.push(styleLabels[video.style] || video.style);
  }

  if (video.source === "mythx-eliza") {
    parts.push("MythXEliza");
  } else if (video.requestKind === "mythx") {
    parts.push("MythX");
  }

  return parts.length > 0 ? parts.join(" • ") : "Autobiographical Cinema";
}

export default async function GalleryPage() {
  let videos: GalleryVideo[] = [];
  let error: string | null = null;

  try {
    videos = await getAllGalleryVideos(50);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load gallery";
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-purple-950/20 to-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12">
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
              MythX Gallery
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Autobiographical videos generated from X profiles, powered by ElizaOS AI agents
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                {videos.length} videos
              </span>
              <span className="px-3 py-1 bg-pink-500/10 border border-pink-500/20 rounded-full">
                Powered by ElizaOS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12">
        {error ? (
          <div className="text-center py-20">
            <p className="text-red-400">{error}</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-semibold text-gray-300">No videos yet</h2>
            <p className="text-gray-500">
              Generate your first autobiographical video from an X profile
            </p>
            <Link
              href="/MythX"
              className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Create Your First Video
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Link
                key={video.jobId}
                href={`/job/${video.jobId}`}
                className="group block bg-gray-900/50 border border-gray-800/50 rounded-xl overflow-hidden hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-800 relative overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={getVideoTitle(video)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <span className="text-4xl">🎥</span>
                    </div>
                  )}
                  
                  {/* Duration Badge */}
                  {video.duration > 0 && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-mono">
                      {video.duration}s
                    </div>
                  )}

                  {/* Source Badge */}
                  {video.source === "mythx-eliza" && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-purple-600/90 rounded text-xs font-semibold">
                      MythXEliza
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
                    {getVideoTitle(video)}
                  </h3>
                  <p className="text-sm text-gray-400">{getVideoSubtitle(video)}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {video.scenes && (
                      <span>{video.scenes} scenes</span>
                    )}
                    {video.createdAt && (
                      <span>
                        {new Date(video.createdAt.toMillis()).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-gray-800/50 bg-gray-950/50">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
          <h2 className="text-2xl font-semibold text-gray-300">
            Want your own autobiographical video?
          </h2>
          <p className="text-gray-500">
            Enter any X profile handle and watch AI transform their tweets into cinema
          </p>
          <Link
            href="/MythX"
            className="inline-block mt-4 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Generate Your Video
          </Link>
        </div>
      </div>
    </div>
  );
}
