// Autonomous page — Live Feed + Group Chat + Agent Logs
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SendIcon } from "@/components/ui/AppIcons";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JobFeedItem {
  jobId: string;
  status: string;
  progress: string | null;
  requestKind: string | null;
  subjectName: string | null;
  subjectSymbol: string | null;
  stylePreset: string | null;
  videoSeconds: number | null;
  experience: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: number;
  role: "user" | "agent";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const STATUS_COLOR: Record<string, string> = {
  processing: "text-yellow-400",
  payment_detected: "text-blue-400",
  complete: "text-green-400",
  failed: "text-red-400",
};

const KIND_ICON: Record<string, string> = {
  mythx: "🎬",
  token_video: "📊",
  generic_cinema: "🎥",
  bedtime_story: "🌙",
  music_video: "🎵",
  scene_recreation: "🔁",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === "processing" || status === "payment_detected"
      ? "bg-yellow-400 animate-pulse"
      : status === "complete"
        ? "bg-green-400"
        : "bg-red-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mr-2`} />;
}

function JobCard({ job }: { job: JobFeedItem }) {
  const icon = KIND_ICON[job.requestKind ?? ""] ?? "🎥";
  const color = STATUS_COLOR[job.status] ?? "text-gray-400";
  return (
    <Link
      href={`/job/${job.jobId}`}
      className="surface-card panel p-3 flex gap-3 hover:border-purple-500/40 transition-all"
    >
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusDot status={job.status} />
          <span className={`text-xs font-semibold uppercase ${color}`}>
            {job.status.replace("_", " ")}
          </span>
          {job.videoSeconds && (
            <span className="text-xs text-gray-500">{job.videoSeconds}s</span>
          )}
        </div>
        <p className="text-sm font-medium truncate mt-0.5">
          {job.subjectName ?? job.subjectSymbol ?? job.jobId.slice(0, 12)}
        </p>
        {job.progress && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{job.progress}</p>
        )}
        <p className="text-xs text-gray-600 mt-1">{timeAgo(job.updatedAt)}</p>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AutonomousPage() {
  // Feed state
  const [jobs, setJobs] = useState<JobFeedItem[]>([]);
  const [feedConnected, setFeedConnected] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatConnected, setChatConnected] = useState(false);
  const [sender] = useState(() => `visitor-${Math.random().toString(36).slice(2, 6)}`);
  const chatRef = useRef<HTMLDivElement>(null);

  // ── Feed SSE ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/autonomous/feed");

    es.onopen = () => setFeedConnected(true);
    es.onerror = () => setFeedConnected(false);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "snapshot" || data.type === "update") {
          setJobs(data.jobs ?? []);
        }
      } catch {}
    };

    return () => es.close();
  }, []);

  // ── Chat SSE ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/autonomous/chat");

    es.onopen = () => setChatConnected(true);
    es.onerror = () => setChatConnected(false);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "history") {
          setChatMessages(data.messages ?? []);
        } else if (data.type === "message") {
          setChatMessages((prev) => [...prev, data.message]);
        }
      } catch {}
    };

    return () => es.close();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    setChatInput("");
    setChatSending(true);
    try {
      await fetch("/api/autonomous/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sender }),
      });
    } finally {
      setChatSending(false);
    }
  }, [chatInput, chatSending, sender]);

  // Derived: logs = processing jobs sorted by most recent update
  const logs = jobs
    .filter((j) => j.status === "processing" || j.status === "payment_detected")
    .slice(0, 20);

  // Derived: feed = all jobs
  const feed = jobs.slice(0, 30);

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8]">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6">

        {/* Header */}
        <div className="panel">
          <p className="eyebrow">ASIMOG Autonomous</p>
          <h1 className="font-display text-3xl md:text-4xl">Agent Feed</h1>
          <p className="route-summary mt-1">
            Live view of the autonomous agent — what it&apos;s creating, group chat,
            and the full video feed. Bot on X:{" "}
            <a href="https://x.com/HyperMythX" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#FFE500]">@HyperMythsX</a>
          </p>
          <div className="flex gap-4 mt-3 text-xs">
            <span className={feedConnected ? "text-green-400" : "text-red-400"}>
              {feedConnected ? "● Feed live" : "○ Feed offline"}
            </span>
            <span className={chatConnected ? "text-green-400" : "text-red-400"}>
              {chatConnected ? "● Chat live" : "○ Chat offline"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Autonomous Logs ─────────────────────────────────── */}
          <div className="space-y-4">
            <div className="panel">
              <p className="eyebrow">Autonomous Logs</p>
              <h2 className="font-display text-xl">Active Jobs</h2>
              <p className="route-summary text-xs mt-1">
                Real-time agent processing log. Updates every 3s.
              </p>
            </div>

            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="surface-card panel p-4 text-center text-gray-500 text-sm">
                  No active jobs right now.
                  <br />
                  <Link href="/creator" className="text-purple-400 mt-2 inline-block">
                    Start generating →
                  </Link>
                </div>
              ) : (
                logs.map((job) => <JobCard key={job.jobId} job={job} />)
              )}
            </div>
          </div>

          {/* ── CENTER: Group Chat ────────────────────────────────────── */}
          <div className="flex flex-col space-y-4">
            <div className="panel">
              <p className="eyebrow">Group Chat</p>
              <h2 className="font-display text-xl">Live Room</h2>
              <p className="route-summary text-xs mt-1">
                Chat with agents and other creators. Messages are ephemeral.
              </p>
            </div>

            <div className="surface-card panel flex flex-col flex-1 min-h-[400px]">
              {/* Messages */}
              <div
                ref={chatRef}
                className="flex-1 overflow-y-auto space-y-2 p-3 max-h-[360px]"
              >
                {chatMessages.length === 0 && (
                  <p className="text-center text-gray-600 text-xs pt-8">
                    No messages yet. Say hello!
                  </p>
                )}
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === sender ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-gray-600 mb-0.5">{msg.sender}</span>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        msg.sender === sender
                          ? "bg-purple-600/30 border border-purple-500/30 text-white"
                          : "bg-white/5 border border-white/10 text-gray-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-white/10 p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendChat();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Say something..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                    disabled={chatSending}
                    maxLength={2000}
                  />
                  <button
                    type="submit"
                    disabled={chatSending || !chatInput.trim()}
                    className="p-2 rounded-xl bg-purple-600 text-white disabled:opacity-40 hover:bg-purple-500 transition-colors"
                  >
                    <SendIcon className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Video Feed ─────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="panel">
              <p className="eyebrow">Video Feed</p>
              <h2 className="font-display text-xl">All Videos</h2>
              <p className="route-summary text-xs mt-1">
                Every video being created — in-progress and completed.
              </p>
            </div>

            <div className="space-y-2">
              {feed.length === 0 ? (
                <div className="surface-card panel p-4 text-center text-gray-500 text-sm">
                  No videos yet.
                  <br />
                  <Link href="/creator" className="text-purple-400 mt-2 inline-block">
                    Create the first one →
                  </Link>
                </div>
              ) : (
                feed.map((job) => <JobCard key={job.jobId} job={job} />)
              )}
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex gap-4 text-sm text-gray-500 pt-4">
          <Link href="/" className="hover:text-white transition-colors">← Chat</Link>
          <Link href="/creator" className="hover:text-white transition-colors">Media →</Link>
        </div>
      </div>
    </div>
  );
}
