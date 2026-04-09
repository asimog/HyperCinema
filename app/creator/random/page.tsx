// Random — one button, AI picks everything.
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

export default function RandomVideoPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 429 ? "Rate limit hit. Try again in a minute." : (data.error ?? "Failed"));
        setLoading(false);
        return;
      }
      window.location.href = `/job/${data.jobId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg text-center">

        <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-[#FFE500] mb-4">
          Random Cinema
        </p>
        <h1 className="font-display text-6xl font-black leading-[0.88] tracking-tighter mb-4">
          NO INPUT.<br />
          <span className="text-[#FFE500]">JUST VIBES.</span>
        </h1>
        <p className="text-[#444] text-sm mb-12 font-mono">
          AI picks the topic, style, and script. You get a video.
        </p>

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className={`w-full py-6 font-mono font-black text-xl tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
            loading ? "bg-[#111] text-[#555]" : "bg-[#FFE500] text-black hover:bg-white"
          }`}
        >
          {loading ? "🎲 GENERATING..." : "🎲 GENERATE RANDOM →"}
        </button>

        {error && (
          <div className="mt-4 border border-[#FF3333] bg-[rgba(255,51,51,0.05)] px-4 py-3 font-mono text-[0.7rem] text-[#FF6666]">
            {error}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-[#111] font-mono text-[0.6rem] tracking-wide text-[#444] space-y-1 text-left">
          <p>→ 30s TikTok-style vertical video</p>
          <p>→ AI-generated topic from crypto/degen universe</p>
          <p>→ Free · Public · No login</p>
          <p>→ Limit: 5 per IP / day</p>
        </div>

        <Link href="/" className="inline-block mt-6 font-mono text-[0.6rem] tracking-widest uppercase text-[#333] hover:text-[#FFE500] transition-colors">
          ← Back
        </Link>
      </div>
    </div>
  );
}
