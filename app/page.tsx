// HyperM — AI chat agent.
// Streams responses from xAI Grok. Detects @handles + wallet addresses and
// offers one-click video generation inline.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// ─── Input detection ──────────────────────────────────────────────────────────

function detectInputType(input: string): "mythx" | "hashmyth" | null {
  const t = input.trim();
  if (!t) return null;
  if (/^@/.test(t) || /^[a-zA-Z][a-zA-Z0-9_]{1,14}$/.test(t)) return "mythx";
  if (/x\.com|twitter\.com/i.test(t)) return "mythx";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(t)) return "hashmyth";
  if (/^0x[a-fA-F0-9]{40}$/.test(t)) return "hashmyth";
  return null;
}

const VIDEO_HINT: Record<string, string> = {
  mythx: "MYTHX VIDEO",
  hashmyth: "HASHMYTH VIDEO",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Chat bubble ─────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 font-mono text-[0.78rem] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-[#FFE500] text-black"
            : "bg-[#111] text-[#e0e0e0] border border-[#222]"
        }`}
      >
        {msg.content ||
          (msg.streaming ? (
            <span className="animate-pulse text-[#555]">▌</span>
          ) : (
            ""
          ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [videoChosen, setVideoChosen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const detectedType = detectInputType(input);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Send chat message (streaming)
  const sendChat = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);

    const userMsg: Message = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);
    setMessageCount((c) => c + 1);

    const systemPrompt = `You are HyperM — sharp, concise, crypto-native. You know DeFi, memecoins, Solana, Ethereum, X (Twitter) culture deeply. Keep answers brief and direct. No filler. If asked about generating videos, tell the user to type a wallet address or @handle and hit the yellow GENERATE button.`;

    try {
      const history = [...messages, userMsg];
      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6).trim();
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                fullText += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: fullText, streaming: true }
                      : m,
                  ),
                );
              }
            } catch {}
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: fullText || "...", streaming: false }
            : m,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  // Generate video (delegate to /api/generate/auto)
  const generateVideo = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setVideoChosen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 429
            ? "Rate limit hit. Try again in a minute."
            : (data.error ?? "Generation failed"),
        );
        setLoading(false);
        return;
      }
      window.location.href = `/job/${data.jobId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }, [input, loading]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    },
    [sendChat],
  );

  // ─── Landing screen (no messages yet) ─────────────────────────────────
  if (messageCount === 0) {
    return (
      <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center">
        {/* Nav */}
        <nav className="fixed top-0 left-0 right-0 border-b border-[#1a1a1a] bg-black/80 backdrop-blur px-6 py-3 flex items-center justify-between font-mono text-[0.65rem] tracking-widest uppercase z-10">
          <span className="text-[#FFE500] font-bold">HYPERM</span>
          <div className="flex gap-6 text-[#888]">
            <Link
              href="/creator"
              className="hover:text-[#FFE500] transition-colors"
            >
              MYTHOS
            </Link>
            <Link
              href="/autonomous"
              className="hover:text-[#FFE500] transition-colors"
            >
              FEED
            </Link>
          </div>
        </nav>

        {/* Centered content */}
        <div className="w-full max-w-2xl px-4 -mt-20 space-y-8">
          {/* Single line greeting */}
          <h1 className="font-mono text-[clamp(1.2rem,4vw,2rem)] font-light text-[#e0e0e0] leading-relaxed text-center">
            What do you want to know or create?
          </h1>

          {/* Video generation hint */}
          {detectedType && (
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-[0.58rem] tracking-[0.15em] text-[#FFE500]">
                {VIDEO_HINT[detectedType]}
              </span>
              <button
                type="button"
                onClick={generateVideo}
                disabled={loading}
                className="px-3 py-1 bg-[#FFE500] text-black font-mono text-[0.6rem] font-black tracking-widest uppercase disabled:opacity-40 hover:bg-white transition-colors cursor-pointer"
              >
                {loading ? "..." : "GENERATE →"}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border border-[#FF3333] bg-[rgba(255,51,51,0.05)] px-3 py-2 font-mono text-[0.65rem] text-[#FF6666] text-center">
              {error}
            </div>
          )}

          {/* Input row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChat();
            }}
            className="flex gap-2"
          >
            <div className="flex-1 border border-[#333] focus-within:border-[#FFE500] transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKey}
                placeholder="Ask anything · @handle · wallet address"
                disabled={loading}
                autoFocus
                className="w-full bg-black text-white px-4 py-3 outline-none placeholder-[#333] font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 bg-[#FFE500] text-black font-mono font-black text-sm tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              {loading ? "..." : "→"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Active chat ──────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#1a1a1a] px-6 py-3 flex items-center justify-between font-mono text-[0.65rem] tracking-widest uppercase shrink-0">
        <span className="text-[#FFE500] font-bold">HYPERM</span>
        <div className="flex gap-6 text-[#888]">
          <Link
            href="/creator"
            className="hover:text-[#FFE500] transition-colors"
          >
            MYTHOS
          </Link>
          <Link
            href="/autonomous"
            className="hover:text-[#FFE500] transition-colors"
          >
            FEED
          </Link>
        </div>
      </nav>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-16 pb-6 max-w-2xl w-full mx-auto"
      >
        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Input dock */}
      <div className="shrink-0 border-t border-[#1a1a1a] bg-black px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Video generation hint */}
          {detectedType && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.58rem] tracking-[0.15em] text-[#FFE500]">
                {VIDEO_HINT[detectedType]}
              </span>
              <button
                type="button"
                onClick={generateVideo}
                disabled={loading}
                className="px-3 py-1 bg-[#FFE500] text-black font-mono text-[0.6rem] font-black tracking-widest uppercase disabled:opacity-40 hover:bg-white transition-colors cursor-pointer"
              >
                {loading ? "..." : "GENERATE →"}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="border border-[#FF3333] bg-[rgba(255,51,51,0.05)] px-3 py-2 font-mono text-[0.65rem] text-[#FF6666]">
              {error}
            </div>
          )}

          {/* Input row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChat();
            }}
            className="flex gap-2"
          >
            <div className="flex-1 border border-[#333] focus-within:border-[#FFE500] transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKey}
                placeholder="Ask anything · @handle · wallet address"
                disabled={loading}
                autoFocus
                className="w-full bg-black text-white px-4 py-3 outline-none placeholder-[#333] font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 bg-[#FFE500] text-black font-mono font-black text-sm tracking-widest uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              {loading ? "..." : "→"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
