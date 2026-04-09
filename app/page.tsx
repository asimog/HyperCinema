// Chat homepage — conversational AI with video generation
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  SendIcon,
  SparkIcon,
  FilmIcon,
  HashIcon,
  TrendingIcon,
} from "@/components/ui/AppIcons";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
};

type QuickAction = {
  id: string;
  label: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  prompt?: string;
  href?: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "mythx",
    label: "MythX",
    icon: FilmIcon,
    prompt: "Create an autobiography video from an X profile",
    href: "/creator/mythx",
  },
  {
    id: "hashmyth",
    label: "HashMyth",
    icon: HashIcon,
    prompt: "Scan a wallet or memecoin and generate a cinematic video",
    href: "/creator/hashmyth",
  },
  {
    id: "random",
    label: "Random Video",
    icon: SparkIcon,
    prompt: "Generate a random TikTok-style video",
    href: "/creator/random",
  },
  {
    id: "gallery",
    label: "Browse Gallery",
    icon: TrendingIcon,
    href: "/gallery",
  },
];

const INITIAL_MESSAGE: Message = {
  id: "intro",
  role: "assistant",
  text: "Hey, I'm your HyperCinema assistant. Tell me what you'd like to create — a video from an X profile, a token story, or just something random. I can also point you to the right creator tool.",
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatHomePage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = { id: uid(), role: "user", text: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      // Placeholder assistant message for streaming
      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", text: "", streaming: true },
      ]);

      // Call the AI chat API via fetch
      fetch("/api/inference/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Something went wrong. Try again.");
          }

          // Handle SSE streaming
          const reader = res.body?.getReader();
          if (!reader) throw new Error("Streaming not available");

          const decoder = new TextDecoder();
          let fullText = "";

          const read = (): Promise<void> =>
            reader.read().then(({ done, value }) => {
              if (done) return;
              const chunk = decoder.decode(value, { stream: true });
              // Parse SSE lines
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.startsWith("data:")) {
                  const data = line.slice(5).trim();
                  if (data) fullText += data;
                }
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, text: fullText } : m,
                ),
              );
              return read();
            });

          return read().then(() => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, text: fullText, streaming: false }
                  : m,
              ),
            );
            setIsStreaming(false);
          });
        })
        .catch((err) => {
          const errorMsg =
            err instanceof Error ? err.message : "Failed to get a response.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, text: errorMsg, streaming: false }
                : m,
            ),
          );
          setIsStreaming(false);
        });
    },
    [isStreaming],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action.href) {
      window.location.href = action.href;
    } else if (action.prompt) {
      sendMessage(action.prompt);
    }
  };

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] text-[#f4efe8] flex flex-col">
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-4 md:px-6 md:py-6">
        {/* Header */}
        <div className="panel mb-4">
          <p className="eyebrow">HyperCinema Chat</p>
          <h1 className="font-display text-3xl md:text-4xl">
            What do you want to create?
          </h1>
          <p className="route-summary mt-2">
            Describe your idea and I'll help you generate it. Free to use.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="surface-card inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:border-purple-500/40 transition-all"
              >
                <Icon className="w-4 h-4 text-purple-400" />
                {action.label}
              </button>
            );
          })}
        </div>

        {/* Chat Thread */}
        <div
          ref={threadRef}
          className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-purple-600/30 border border-purple-500/30 text-white"
                    : "surface-card text-gray-200"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.text}
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-4 bg-purple-400 ml-1 animate-pulse" />
                  )}
                </p>
                {/* Video generation button if message suggests it */}
                {msg.role === "assistant" &&
                  !msg.streaming &&
                  msg.text.length > 0 && (
                    <GenerateVideoButton text={msg.text} />
                  )}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSubmit} className="mt-2">
          <div className="surface-card flex items-center gap-2 px-4 py-2 rounded-2xl border border-purple-500/20">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the video you want to create..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none py-2"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="p-2 rounded-xl bg-purple-600 text-white disabled:opacity-40 hover:bg-purple-500 transition-colors"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Show a "Generate Video" button if the assistant response mentions video
function GenerateVideoButton({ text }: { text: string }) {
  const lower = text.toLowerCase();
  const mentionsVideo =
    lower.includes("video") ||
    lower.includes("generate") ||
    lower.includes("create") ||
    lower.includes("mythx") ||
    lower.includes("hashmyth") ||
    lower.includes("cinema");

  if (!mentionsVideo) return null;

  return (
    <Link
      href="/creator"
      className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-semibold text-white hover:from-purple-500 hover:to-pink-500 transition-all"
    >
      <FilmIcon className="w-3.5 h-3.5" />
      Go to Creator
    </Link>
  );
}
