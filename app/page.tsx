// HyperCinema — AI chat homepage.
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
  mythx: "→ GENERATE MYTHX VIDEO",
  hashmyth: "→ GENERATE HASHMYTH VIDEO",
};

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are HyperCinema AI — sharp, concise, crypto-native. You know DeFi, memecoins, Solana, Ethereum, X (Twitter) culture deeply. You help users understand wallets, tokens, and on-chain activity. Keep answers brief and direct. No filler. If asked about generating videos, tell the user to type a wallet address or @handle and hit the yellow button.`;

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
        {msg.content || (msg.streaming ? <span className="animate-pulse text-[#555]">▌</span> : "")}
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
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg];
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
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
          m.id === assistantId ? { ...m, content: fullText || "...", streaming: false } : m,
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
        setError(res.status === 429 ? "Rate limit hit. Try again in a minute." : (data.error ?? "Generation failed"));
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

  return (
    <div className="min-h-dvh bg-black text-white flex flex-col">

      {/* Nav */}
      <nav className="border-b border-[#1a1a1a] px-6 py-3 flex items-center justify-between font-mono text-[0.65rem] tracking-widest uppercase shrink-0">
        <span className="text-[#FFE500] font-bold">HYPERCINEMA</span>
        <div className="flex gap-6 text-[#555]">
          <Link href="/creator" className="hover:text-[#FFE500] transition-colors">MEDIA</Link>
          <Link href="/autonomous" className="hover:text-[#FFE500] transition-colors">FEED</Link>
          <Link href="/admin/inference" className="hover:text-[#FFE500] transition-colors">ADMIN</Link>
        </div>
      </nav>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[40vh] text-center space-y-6">
            <div>
              <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-[#FFE500] mb-3">
                AI · Crypto · Cinema
              </p>
              <h1 className="font-display text-[clamp(2.5rem,8vw,4rem)] font-black leading-[0.88] tracking-tighter">
                ASK ANYTHING.<br />
                <span className="text-[#FFE500]">OR GENERATE.</span>
              </h1>
            </div>

            {/* Quick starters */}
            <div className="w-full max-w-sm space-y-2">
              {[
                { label: "What is this?", text: "What is HyperCinema and what can I do here?" },
                { label: "Explain a memecoin", text: "How do I check if a Solana memecoin is safe to buy?" },
                { label: "MythX demo", text: "Generate a MythX video for @elonmusk" },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                  className="w-full text-left border border-[#222] text-[#555] px-3 py-2 font-mono text-[0.62rem] tracking-wide hover:border-[#FFE500] hover:text-[#FFE500] transition-colors bg-transparent cursor-pointer"
                >
                  {s.label} →
                </button>
              ))}
            </div>

            {/* 3 capabilities */}
            <div className="grid grid-cols-3 gap-4 text-center w-full max-w-sm pt-4 border-t border-[#111]">
              {[
                { icon: "🎬", title: "MythX", desc: "@handle → video" },
                { icon: "📊", title: "HashMyth", desc: "wallet → cinema" },
                { icon: "💬", title: "Chat", desc: "ask anything" },
              ].map((item) => (
                <div key={item.title}>
                  <div className="text-xl mb-1">{item.icon}</div>
                  <div className="font-mono text-[0.58rem] font-bold tracking-widest uppercase text-white mb-0.5">
                    {item.title}
                  </div>
                  <div className="text-[0.62rem] text-[#444]">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            onSubmit={(e) => { e.preventDefault(); sendChat(); }}
            className="flex gap-2"
          >
            <div className="flex-1 border border-[#333] focus-within:border-[#FFE500] transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null); }}
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

          <p className="font-mono text-[0.55rem] tracking-wide text-[#333]">
            ENTER to send · wallet/handle auto-detected for video · <Link href="/creator" className="text-[#444] hover:text-[#FFE500]">media studio</Link> · <a href="https://x.com/HyperMythX" target="_blank" rel="noopener noreferrer" className="text-[#444] hover:text-[#FFE500]">@HyperMythsX</a>
          </p>
        </div>
      </div>
    </div>
  );
}
