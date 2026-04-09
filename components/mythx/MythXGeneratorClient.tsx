// MythX — X profile → autobiography video. One input, one button.
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

export default function MythXGeneratorClient() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    const handle = input.trim();
    if (!handle) { setError("Enter an X profile handle or URL"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: handle }),
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
  }, [input]);

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">

        <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-[#FFE500] mb-4">
          MythX — X Profile Cinema
        </p>
        <h1 className="font-display text-5xl font-black leading-[0.9] tracking-tighter mb-8">
          X PROFILE<br />→ VIDEO
        </h1>

        <div className="border-2 border-[#333] p-px mb-2 focus-within:border-[#FFE500] transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") generate(); }}
            placeholder="@username or https://x.com/username"
            disabled={loading}
            autoFocus
            className="w-full bg-black text-white px-4 py-4 outline-none placeholder-[#333] text-base font-sans"
          />
        </div>

        <p className="font-mono text-[0.58rem] tracking-wide text-[#555] mb-4 h-4">
          {input.trim() ? `→ GENERATING VIDEO FOR ${input.trim()}` : "→ ENTER HANDLE OR URL"}
        </p>

        <button
          type="button"
          onClick={generate}
          disabled={loading || !input.trim()}
          className={`w-full py-4 font-mono font-black text-base tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
            loading ? "bg-[#111] text-[#555]" : "bg-[#FFE500] text-black"
          }`}
        >
          {loading ? "GENERATING..." : "GENERATE →"}
        </button>

        {error && (
          <div className="mt-4 border border-[#FF3333] bg-[rgba(255,51,51,0.05)] px-4 py-3 font-mono text-[0.7rem] text-[#FF6666]">
            {error}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-[#111] font-mono text-[0.6rem] tracking-wide text-[#444] space-y-1">
          <p>→ Last 42 tweets analyzed</p>
          <p>→ 30s cinematic video generated</p>
          <p>→ Free · Public · No login</p>
          <p>→ Limit: 2 videos per profile / day</p>
        </div>

        <Link href="/" className="inline-block mt-6 font-mono text-[0.6rem] tracking-widest uppercase text-[#333] hover:text-[#FFE500] transition-colors">
          ← Back
        </Link>
      </div>
    </div>
  );
}
