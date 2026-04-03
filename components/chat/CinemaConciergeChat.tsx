"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PaymentInstructionsCard } from "@/components/PaymentInstructionsCard";
import { MoonPayHostedPaymentButton } from "@/components/payments/MoonPayHostedPaymentButton";
import {
  ArrowRightIcon,
  ChainIcon,
  ClockIcon,
  FilmIcon,
  HashIcon,
  HeartIcon,
  PaletteIcon,
  SendIcon,
  SparkIcon,
  TrendingIcon,
  WalletIcon,
} from "@/components/ui/AppIcons";
import {
  CINEMA_PAGE_CONFIGS,
  type CinemaPageId,
  getCinemaPackageConfig,
} from "@/lib/cinema/config";
import { buildDirectorPrompt } from "@/lib/cinema/directorPrompt";
import { normalizeXProfileInput } from "@/lib/x/api";
import type {
  JobDocument,
  PackageType,
  RequestedTokenChain,
  VideoStyleId,
} from "@/lib/types/domain";

type ConciergeStep =
  | "choose_experience"
  | "subject"
  | "token_address"
  | "chain"
  | "description"
  | "style"
  | "package"
  | "audio"
  | "discount_code"
  | "confirm"
  | "payment";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  agentName?: string;
};

type ConciergeDraft = {
  experienceId: CinemaPageId | null;
  subjectName: string;
  tokenAddress: string;
  chain: RequestedTokenChain;
  description: string;
  packageType: PackageType;
  audioEnabled: boolean;
  stylePreset: VideoStyleId | null;
  discountCode: string;
};

interface CinemaConciergeChatProps {
  initialExperienceId?: CinemaPageId | null;
}

interface CreateJobResponse {
  jobId: string;
  priceSol: number;
  paymentAddress: string;
  amountSol: number;
  paymentRequired: boolean;
  tokenAddress?: string | null;
  chain?: RequestedTokenChain | null;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  stylePreset?: VideoStyleId | null;
  discountCode?: string | null;
}

interface JobStatusResponse {
  job?: JobDocument;
  status?: string;
  progress?: string;
  payment?: {
    amountSol: number;
    paymentAddress: string;
    receivedSol?: number;
    remainingSol?: number;
  };
  error?: string;
  message?: string;
}

/* ── Agent persona per category ──────────────────────────────────── */

type AgentPersona = {
  director: string;
  sound: string;
  editor: string;
  greeting: string;
};

const DEFAULT_PERSONA: AgentPersona = {
  director: "HyperMyths",
  sound: "MythSound",
  editor: "MythEditor",
  greeting: "I'm your HyperMyths guide. I'll gather the details, shape the brief, create the order, and keep you updated until production starts.",
};

const AGENT_PERSONAS: Partial<Record<CinemaPageId, AgentPersona>> = {
  hyperm: {
    director: "HyperMyths",
    sound: "HyperMyths",
    editor: "HyperMyths",
    greeting: "HyperMyths is ready. Build a bold creator cut and I’ll keep the brief sharp.",
  },
  mythx: {
    director: "HyperMyths",
    sound: "HyperMyths",
    editor: "HyperMyths",
    greeting: "HyperMyths is ready. Drop an X profile link or @handle and I’ll shape the last 42 posts into a cinematic autobiography.",
  },
  hashmyth: {
    director: "HashIntern",
    sound: "HashIntern",
    editor: "HashIntern",
    greeting: "Yo, HashIntern here. Paste a token or wallet address, any chain, and I'll turn your trading story into cinema. Let's see that PnL.",
  },
  lovex: {
    director: "MythFren",
    sound: "MythFren",
    editor: "MythFren",
    greeting: "Hello, MythFren here. Let's craft something slow, classy, and beautiful. Classical music, no words, unless you want them. Pick a style to begin.",
  },
  hypercinema: {
    director: "HyperMyths",
    sound: "HyperMyths",
    editor: "HyperMyths",
    greeting: "HyperMyths is ready. You have 42 cinematic styles to choose from, from VHS grain to watercolor worlds. What's the vision?",
  },
  trenchcinema: {
    director: "HyperMyths",
    sound: "HyperMyths",
    editor: "HyperMyths",
    greeting: "HyperMyths is ready. Bring the token, wallet, or meme story and I’ll shape it into a fast cinematic cut.",
  },
  funcinema: {
    director: "MythEditor",
    sound: "MythSound",
    editor: "MythEditor",
    greeting: "MythEditor reporting. Weird, random, playful, let's make something fun.",
  },
  familycinema: {
    director: "MythLoveIntern",
    sound: "MythSound",
    editor: "MythLoveIntern",
    greeting: "MythLoveIntern here. Family moments deserve care. Let's make a keepsake.",
  },
  musicvideo: {
    director: "MythSound",
    sound: "MythSound",
    editor: "MythEditor",
    greeting: "MythSound in the booth. Music-led, rhythm-first. What's the track?",
  },
};

function getPersona(experienceId: CinemaPageId | null): AgentPersona {
  if (!experienceId) return DEFAULT_PERSONA;
  return AGENT_PERSONAS[experienceId] ?? DEFAULT_PERSONA;
}

/* ── Concierge experiences shown as quick choices ────────────────── */

const CONCIERGE_EXPERIENCES = [
  { ...CINEMA_PAGE_CONFIGS.hyperm, label: "HyperM" },
  { ...CINEMA_PAGE_CONFIGS.mythx, label: "MythX" },
  { ...CINEMA_PAGE_CONFIGS.lovex, label: "LoveX" },
  { ...CINEMA_PAGE_CONFIGS.hashmyth, label: "HashMyth" },
] as const;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "assistant-intro-1",
    role: "assistant",
    text: "Hi, I'm HyperMyths. I'll collect the essentials, tighten the brief, create your order, and keep the process moving.",
    agentName: "HyperMyths",
  },
  {
    id: "assistant-intro-2",
    role: "assistant",
    text: "Start by choosing a studio.",
    agentName: "HyperMyths",
  },
];

function buildInitialConversationState(initialExperienceId?: CinemaPageId | null) {
  if (!initialExperienceId) {
    return {
      step: "choose_experience" as ConciergeStep,
      messages: INITIAL_MESSAGES,
      draft: {
        experienceId: null,
        subjectName: "",
        tokenAddress: "",
        chain: "auto" as RequestedTokenChain,
        description: "",
        packageType: "1d" as PackageType,
        audioEnabled: false,
        stylePreset: null,
        discountCode: "",
      },
    };
  }

  const config = CINEMA_PAGE_CONFIGS[initialExperienceId];
  const nextStep: ConciergeStep =
    config.requestKind === "token_video" ? "token_address" : "subject";

  return {
    step: nextStep,
    messages: [
      {
        id: "assistant-page-context",
        role: "assistant",
        text:
          config.requestKind === "token_video"
            ? "Paste the token contract or mint address."
            : config.id === "mythx"
              ? "Paste an X profile link or @handle."
              : "What should we call this video?",
        agentName: getPersona(initialExperienceId).director,
      },
    ] satisfies ChatMessage[],
    draft: {
      experienceId: initialExperienceId,
      subjectName: "",
      tokenAddress: "",
      chain: "auto" as RequestedTokenChain,
      description: "",
      packageType: "1d" as PackageType,
      audioEnabled: config.defaultAudioEnabled,
      stylePreset: null,
      discountCode: "",
    },
  };
}

/* ── LoveX style dropdown options ────────────────────────────────── */

const LOVEX_STYLE_CHOICES: { value: VideoStyleId; label: string }[] = [
  { value: "love_slow_waltz", label: "Slow Waltz" },
  { value: "love_golden_cinema", label: "Golden Cinema" },
  { value: "love_moonlit_garden", label: "Moonlit Garden" },
  { value: "love_timeless_portrait", label: "Timeless Portrait" },
];

/* ── Utility functions ───────────────────────────────────────────── */

function statusLabel(status?: string, progress?: string): string {
  if (status === "awaiting_payment") return "Checkout ready";
  if (status === "payment_detected") return "Payment received";
  if (status === "payment_confirmed") return "Payment confirmed";
  if (progress === "generating_report") return "Building story pack";
  if (progress === "generating_video") return "Rendering video";
  if (status === "processing") return "In production";
  if (status === "complete") return "Ready";
  if (status === "failed") return "Failed";
  return "Staging";
}

function createMessage(
  role: "assistant" | "user",
  text: string,
  agentName?: string,
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    agentName,
  };
}

function parseExperience(input: string): CinemaPageId | null {
  const normalized = input.toLowerCase().replace(/\s+/g, "");
  if (normalized.includes("hash") || normalized.includes("trading") || normalized.includes("wallet") || normalized.includes("pnl")) return "hashmyth";
  if (normalized.includes("hyper") || normalized.includes("cinema") || normalized.includes("style") || normalized.includes("direct")) return "hypercinema";
  if (normalized.includes("love") || normalized.includes("romance") || normalized.includes("classic") || normalized.includes("slow")) return "lovex";
  if (normalized.includes("trend") || normalized.includes("gallery") || normalized.includes("trench") || normalized.includes("token") || normalized.includes("meme")) return "trenchcinema";
  if (normalized.includes("fun") || normalized.includes("weird") || normalized.includes("random")) return "funcinema";
  if (normalized.includes("family") || normalized.includes("photo") || normalized.includes("kids") || normalized.includes("mom") || normalized.includes("dad")) return "familycinema";
  if (normalized.includes("music") || normalized.includes("song") || normalized.includes("beat")) return "musicvideo";
  return null;
}

function parsePackage(input: string): PackageType | null {
  const normalized = input.toLowerCase();
  if (normalized.includes("60") || normalized.includes("2d")) return "2d";
  if (normalized.includes("30") || normalized.includes("1d")) return "1d";
  return null;
}

function parseAudio(input: string): boolean | null {
  const normalized = input.toLowerCase();
  if (
    normalized === "yes" ||
    normalized === "y" ||
    normalized.includes("audio on") ||
    normalized.includes("with audio")
  ) {
    return true;
  }

  if (
    normalized === "no" ||
    normalized === "n" ||
    normalized.includes("audio off") ||
    normalized.includes("silent")
  ) {
    return false;
  }

  return null;
}

function parseChain(input: string): RequestedTokenChain | null {
  const normalized = input.toLowerCase();
  if (normalized.includes("auto")) return "auto";
  if (normalized.includes("sol")) return "solana";
  if (normalized.includes("eth")) return "ethereum";
  if (normalized.includes("bnb") || normalized.includes("bsc")) return "bsc";
  if (normalized.includes("base")) return "base";
  return null;
}

function summaryText(input: {
  configTitle: string;
  draft: ConciergeDraft;
  experienceId: CinemaPageId;
  tokenFlow: boolean;
  pricingMode: "public" | "private";
}): string {
  const packageConfig = getCinemaPackageConfig({
    packageType: input.draft.packageType,
    pricingMode: input.pricingMode,
  });

  const summaryLines = [
    `Category: ${input.configTitle}`,
    input.tokenFlow
      ? `Token address: ${input.draft.tokenAddress}`
      : input.experienceId === "mythx"
        ? `X profile: ${input.draft.subjectName}`
        : input.experienceId === "lovex"
          ? `Moment: ${input.draft.subjectName}`
          : `Title: ${input.draft.subjectName}`,
    input.tokenFlow ? `Chain: ${input.draft.chain}` : null,
    `Description: ${input.draft.description}`,
    input.draft.stylePreset ? `Style: ${input.draft.stylePreset}` : null,
    `Runtime: ${packageConfig.videoSeconds} seconds`,
    `Audio: ${input.draft.audioEnabled ? "on" : "off"}`,
  ].filter(Boolean);

  return summaryLines.join("\n");
}

function buildForwardedPrompt(input: {
  configTitle: string;
  draft: ConciergeDraft;
  tokenFlow: boolean;
  requestKind: string;
}): string {
  return buildDirectorPrompt({
    categoryTitle: input.configTitle,
    subjectName: input.tokenFlow ? input.draft.tokenAddress : input.draft.subjectName,
    subjectDescription: input.draft.description || undefined,
    packageType: input.draft.packageType,
    audioEnabled: input.draft.audioEnabled,
    requestKind: input.requestKind,
  });
}

/* ── Main component ──────────────────────────────────────────────── */

export function CinemaConciergeChat(input: CinemaConciergeChatProps) {
  const isWorkspaceMode = Boolean(input.initialExperienceId);
  const initialState = useMemo(
    () => buildInitialConversationState(input.initialExperienceId ?? null),
    [input.initialExperienceId],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialState.messages);
  const [step, setStep] = useState<ConciergeStep>(initialState.step);
  const [draft, setDraft] = useState<ConciergeDraft>(initialState.draft);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [jobPayment, setJobPayment] = useState<CreateJobResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const lastPolledStatusRef = useRef<string | null>(null);

  useEffect(() => {
    setMessages(initialState.messages);
    setStep(initialState.step);
    setDraft(initialState.draft);
    setInputValue("");
    setError(null);
    setJobPayment(null);
    setJobStatus(null);
    lastPolledStatusRef.current = null;
  }, [initialState]);

  const selectedConfig = useMemo(() => {
    if (!draft.experienceId) return null;
    return CINEMA_PAGE_CONFIGS[draft.experienceId];
  }, [draft.experienceId]);

  const persona = useMemo(() => getPersona(draft.experienceId), [draft.experienceId]);

  useEffect(() => {
    const node = threadRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, jobPayment, jobStatus]);

  useEffect(() => {
    if (!jobPayment?.jobId) return;

    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobPayment.jobId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as JobStatusResponse;

        if (!response.ok) {
          throw new Error(payload.message ?? payload.error ?? "Failed to fetch job status.");
        }

        if (cancelled) return;

        setJobStatus(payload);
        const status = payload.job?.status ?? payload.status ?? null;
        if (status && status !== lastPolledStatusRef.current) {
          lastPolledStatusRef.current = status;

          if (status === "payment_detected") {
            setMessages((current) => [
              ...current,
              createMessage("assistant", "Payment received. Confirming now.", persona.director),
            ]);
          }

          if (status === "payment_confirmed") {
            setMessages((current) => [
              ...current,
              createMessage("assistant", "Payment confirmed. Starting your video now.", persona.director),
            ]);
          }
        }

        if (status === "processing" || status === "complete") {
          cancelled = true;
          if (timer) clearInterval(timer);
          window.location.href = `/job/${jobPayment.jobId}`;
        }
      } catch (pollError) {
        if (!cancelled) {
          const message = pollError instanceof Error ? pollError.message : "Polling failed.";
          setError(message);
        }
      }
    };

    void poll();
    timer = setInterval(() => void poll(), 6000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [jobPayment?.jobId, persona.director]);

  const isLoveX = draft.experienceId === "lovex";

  const quickChoices = useMemo(() => {
    if (step === "choose_experience") {
      return CONCIERGE_EXPERIENCES.map((config) => ({
        value: config.id,
        label: config.label,
      }));
    }

    if (step === "chain") {
      return [
        { value: "auto", label: "Auto" },
        { value: "solana", label: "Solana" },
        { value: "ethereum", label: "Ethereum" },
        { value: "bsc", label: "BNB Chain" },
        { value: "base", label: "Base" },
      ];
    }

    if (step === "style" && isLoveX) {
      return LOVEX_STYLE_CHOICES.map((s) => ({ value: s.value, label: s.label }));
    }

    if (step === "package") {
      return [
        { value: "1d", label: "30 sec" },
        { value: "2d", label: "60 sec" },
      ];
    }

    if (step === "audio") {
      return [
        { value: "yes", label: "Audio on" },
        { value: "no", label: "Audio off" },
      ];
    }

    if (step === "confirm") {
      return [
        { value: "discount_code", label: "Enter discount code" },
        { value: "create", label: "Continue to checkout" },
        { value: "restart", label: "Start over" },
      ];
    }

    return [];
  }, [step, isLoveX]);

  function quickChoiceIcon(value: string) {
    if (step === "choose_experience") {
      switch (value) {
        case "hyperm":
          return SparkIcon;
        case "mythx":
          return FilmIcon;
        case "hashmyth":
          return HashIcon;
        case "hypercinema":
          return PaletteIcon;
        case "lovex":
          return HeartIcon;
        case "trenchcinema":
          return TrendingIcon;
        default:
          return FilmIcon;
      }
    }

    if (step === "chain") {
      switch (value) {
        case "solana":
          return SparkIcon;
        case "ethereum":
          return ChainIcon;
        case "bsc":
          return WalletIcon;
        case "base":
          return PaletteIcon;
        default:
          return ArrowRightIcon;
      }
    }

    if (step === "package") return ClockIcon;
    if (step === "audio") return SendIcon;
    if (step === "confirm") return SparkIcon;

    return ArrowRightIcon;
  }

  function agentMsg(text: string): ChatMessage {
    return createMessage("assistant", text, persona.director);
  }

  function askForDescription() {
    setStep("description");
    setMessages((current) => [
      ...current,
      agentMsg(
        selectedConfig?.id === "mythx"
          ? "Now describe the biography angle."
          : selectedConfig?.id === "lovex"
            ? "Now describe the family moment."
            : "Now describe the visual direction and key beats.",
      ),
    ]);
  }

  function askForStyle() {
    if (isLoveX) {
      setStep("style");
      setMessages((current) => [
        ...current,
        agentMsg("Pick a look for your love story."),
      ]);
      return;
    }
    askForPackage();
  }

  function askForPackage() {
    setStep("package");
    setMessages((current) => [
      ...current,
      agentMsg("Choose runtime: 30 sec or 60 sec."),
    ]);
  }

  function askForDiscountCode() {
    setStep("discount_code");
    setMessages((current) => [
      ...current,
      agentMsg("Enter your one-time discount code or type skip to continue to payment."),
    ]);
  }

  function openConfirmation(input: {
    nextDraft: ConciergeDraft;
    configTitle: string;
    tokenFlow: boolean;
    pricingMode: "public" | "private";
  }) {
    const packageConfig = getCinemaPackageConfig({
      packageType: input.nextDraft.packageType,
      pricingMode: input.pricingMode,
    });
    const compactSummary = [
      `${packageConfig.videoSeconds} sec`,
      input.nextDraft.audioEnabled ? "audio on" : "audio off",
      input.nextDraft.stylePreset ? "style locked" : null,
    ]
      .filter(Boolean)
      .join(" - ");

    setStep("confirm");
    setMessages((current) => [
      ...current,
      agentMsg(
        isWorkspaceMode
          ? `Ready to generate. ${compactSummary}.`
          : "Perfect. Review this brief:",
      ),
      ...(isWorkspaceMode
        ? []
        : [
            agentMsg(
              summaryText({
                configTitle: input.configTitle,
                draft: input.nextDraft,
                experienceId: input.nextDraft.experienceId ?? draft.experienceId ?? "hyperm",
                tokenFlow: input.tokenFlow,
                pricingMode: input.pricingMode,
              }),
            ),
          ]),
      agentMsg(
        isWorkspaceMode
          ? "Use a discount code or generate the paid job."
          : "If you have a discount code, enter it now. Otherwise continue to checkout.",
      ),
    ]);
  }

  function chooseExperience(experienceId: CinemaPageId) {
    const config = CINEMA_PAGE_CONFIGS[experienceId];
    const nextPersona = getPersona(experienceId);
    const nextDraft: ConciergeDraft = {
      experienceId,
      subjectName: "",
      tokenAddress: "",
      chain: "auto",
      description: "",
      packageType: "1d",
      audioEnabled: config.defaultAudioEnabled,
      stylePreset: null,
      discountCode: "",
    };

    setDraft(nextDraft);
    setError(null);
    setJobPayment(null);
    setJobStatus(null);

    // Greeting from the selected studio guide
    setMessages((current) => [
      ...current,
      createMessage("assistant", nextPersona.greeting, nextPersona.director),
    ]);

    if (config.requestKind === "token_video") {
      setStep("token_address");
      setMessages((current) => [
        ...current,
        createMessage("assistant", "Paste the token contract or mint address.", nextPersona.director),
      ]);
      return;
    }

    setStep("subject");
    setMessages((current) => [
      ...current,
      createMessage(
        "assistant",
        config.id === "mythx"
          ? "Paste an X profile link or @handle."
          : "What should we call this video?",
        nextPersona.director,
      ),
    ]);
  }

  function resetConversation() {
    const nextState = buildInitialConversationState(input.initialExperienceId ?? null);
    setDraft(nextState.draft);
    setStep(nextState.step);
    setMessages(nextState.messages);
    setInputValue("");
    setError(null);
    setJobPayment(null);
    setJobStatus(null);
    lastPolledStatusRef.current = null;
  }

  async function createJobFromDraft(discountCode?: string | null) {
    if (!selectedConfig) return;

    const tokenFlow = selectedConfig.requestKind === "token_video";
    const isMythX = selectedConfig.id === "mythx";
    const normalizedProfile = isMythX
      ? normalizeXProfileInput(draft.subjectName.trim())
      : { username: null, profileUrl: null };
    if (tokenFlow && draft.tokenAddress.trim().length < 20) {
      setError("Please provide a valid token address.");
      return;
    }

    if (!tokenFlow && isMythX && !normalizedProfile.profileUrl) {
      setError("Please provide a valid X profile link or @handle.");
      return;
    }

    if (!tokenFlow && !isMythX && draft.subjectName.trim().length < 2) {
      setError("Please provide a valid title.");
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const resolvedProfileInput = draft.subjectName.trim();
      const resolvedSubjectName = isMythX
        ? normalizedProfile.username
          ? `@${normalizedProfile.username}`
          : resolvedProfileInput
        : resolvedProfileInput;
      const resolvedSourceMediaUrl = isMythX
        ? normalizedProfile.profileUrl ?? resolvedProfileInput
        : null;
      const body =
        selectedConfig.requestKind === "token_video"
          ? {
              requestKind: "token_video" as const,
              tokenAddress: draft.tokenAddress.trim(),
              chain: draft.chain,
              packageType: draft.packageType,
              stylePreset: draft.stylePreset ?? selectedConfig.defaultStyle,
              subjectDescription: draft.description.trim() || undefined,
              requestedPrompt: buildForwardedPrompt({
                configTitle: selectedConfig.title,
                draft,
                tokenFlow: true,
                requestKind: "token_video",
              }),
              audioEnabled: draft.audioEnabled,
              pricingMode: selectedConfig.pricingMode,
              visibility: selectedConfig.visibility,
              experience: selectedConfig.id,
              discountCode:
                discountCode?.trim() ||
                draft.discountCode.trim() ||
                undefined,
            }
          : {
              requestKind: selectedConfig.requestKind,
              subjectName: resolvedSubjectName,
              subjectDescription: draft.description.trim() || undefined,
              sourceMediaUrl: resolvedSourceMediaUrl ?? undefined,
              sourceMediaProvider: isMythX ? "x" : undefined,
              packageType: draft.packageType,
              stylePreset: draft.stylePreset ?? selectedConfig.defaultStyle,
              requestedPrompt: buildForwardedPrompt({
                configTitle: selectedConfig.title,
                draft,
                tokenFlow: false,
                requestKind: selectedConfig.requestKind,
              }),
              audioEnabled: draft.audioEnabled,
              pricingMode: selectedConfig.pricingMode,
              visibility: selectedConfig.visibility,
              experience: selectedConfig.id,
              discountCode:
                discountCode?.trim() ||
                draft.discountCode.trim() ||
                undefined,
            };

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as CreateJobResponse & {
        error?: string;
        message?: string;
      };

      if (!response.ok || !payload.jobId) {
        throw new Error(payload.message ?? payload.error ?? "Failed to create job.");
      }

      if (payload.paymentRequired === false) {
        setMessages((current) => [
          ...current,
          agentMsg("Discount code accepted. Your job is live now."),
        ]);
        window.location.href = `/job/${payload.jobId}`;
        return;
      }

      setJobPayment(payload);
      setJobStatus({ status: "awaiting_payment", progress: "awaiting_payment" });
      setStep("payment");
      setMessages((current) => [
        ...current,
        agentMsg("Job created. Finish checkout below."),
      ]);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Unexpected error while creating job.";
      setError(message);
      setMessages((current) => [...current, agentMsg(message)]);
    } finally {
      setIsCreating(false);
    }
  }

  function processUserText(rawText: string) {
    const text = rawText.trim();
    if (!text) return;

    setMessages((current) => [...current, createMessage("user", text)]);
    setInputValue("");
    setError(null);

    if (step === "choose_experience") {
      const parsed = parseExperience(text);
      if (!parsed) {
        setMessages((current) => [
          ...current,
          agentMsg("Pick a studio from the chips so I can guide the right flow."),
        ]);
        return;
      }

      chooseExperience(parsed);
      return;
    }

    if (!selectedConfig) {
      setMessages((current) => [
        ...current,
        agentMsg("Choose a studio first."),
      ]);
      setStep(input.initialExperienceId ? initialState.step : "choose_experience");
      return;
    }

    if (step === "subject") {
      const nextDraft = { ...draft, subjectName: text };
      setDraft(nextDraft);
      askForDescription();
      return;
    }

    if (step === "token_address") {
      if (text.length < 20) {
        setMessages((current) => [
          ...current,
          agentMsg("That address looks too short. Please paste the full token address."),
        ]);
        return;
      }

      setDraft((current) => ({ ...current, tokenAddress: text }));
      setStep("chain");
      setMessages((current) => [
        ...current,
        agentMsg("Which chain should I use?"),
      ]);
      return;
    }

    if (step === "chain") {
      const parsedChain = parseChain(text);
      if (!parsedChain) {
        setMessages((current) => [
          ...current,
          agentMsg("Choose Auto, Solana, Ethereum, BNB Chain, or Base."),
        ]);
        return;
      }

      setDraft((current) => ({ ...current, chain: parsedChain }));
      askForDescription();
      return;
    }

    if (step === "description") {
      setDraft((current) => ({ ...current, description: text }));
      if (isLoveX) {
        askForStyle();
      } else {
        askForPackage();
      }
      return;
    }

    if (step === "style") {
      // Try to match LoveX style from text
      const normalized = text.toLowerCase();
      const matched = LOVEX_STYLE_CHOICES.find(
        (s) => normalized.includes(s.label.toLowerCase()) || normalized.includes(s.value),
      );
      if (matched) {
        setDraft((current) => ({ ...current, stylePreset: matched.value }));
        askForPackage();
        return;
      }
      setMessages((current) => [
        ...current,
        agentMsg("Pick one of the four styles from the chips."),
      ]);
      return;
    }

    if (step === "package") {
      const parsedPackage = parsePackage(text);
      if (!parsedPackage) {
        setMessages((current) => [
          ...current,
          agentMsg("Use 30 sec or 60 sec."),
        ]);
        return;
      }

      const nextDraft = { ...draft, packageType: parsedPackage };
      setDraft(nextDraft);

      if (selectedConfig.audioMode === "required") {
        const enforcedAudioDraft = { ...nextDraft, audioEnabled: true };
        setDraft(enforcedAudioDraft);
        openConfirmation({
          nextDraft: enforcedAudioDraft,
          configTitle: selectedConfig.title,
          tokenFlow: selectedConfig.requestKind === "token_video",
          pricingMode: selectedConfig.pricingMode,
        });
        return;
      }

      setStep("audio");
      setMessages((current) => [
        ...current,
        agentMsg("Do you want audio on?"),
      ]);
      return;
    }

    if (step === "audio") {
      const parsedAudio = parseAudio(text);
      if (parsedAudio === null) {
        setMessages((current) => [
          ...current,
          agentMsg("Please answer yes or no."),
        ]);
        return;
      }

      const nextDraft = { ...draft, audioEnabled: parsedAudio };
      setDraft(nextDraft);
      openConfirmation({
        nextDraft,
        configTitle: selectedConfig.title,
        tokenFlow: selectedConfig.requestKind === "token_video",
        pricingMode: selectedConfig.pricingMode,
      });
      return;
    }

    if (step === "confirm") {
      const lower = text.toLowerCase();

      if (lower.includes("restart")) {
        resetConversation();
        return;
      }

      if (lower.includes("generate") || lower.includes("pay") || lower === "skip") {
        void createJobFromDraft();
        return;
      }

      if (lower.includes("discount") || lower.includes("code")) {
        askForDiscountCode();
        return;
      }

      void createJobFromDraft(text);
      return;
    }

    if (step === "discount_code") {
      const lower = text.toLowerCase();
      if (lower === "skip" || lower === "no" || lower === "continue") {
        void createJobFromDraft();
        return;
      }

      setDraft((current) => ({ ...current, discountCode: text }));
      void createJobFromDraft(text);
      return;
    }
  }

  function onChoiceClick(value: string) {
    if (step === "choose_experience") {
      const entry = CONCIERGE_EXPERIENCES.find((e) => e.id === value);
      const label = entry?.label ?? value;
      setMessages((current) => [...current, createMessage("user", label)]);
      chooseExperience(value as CinemaPageId);
      return;
    }

    if (step === "style") {
      const matched = LOVEX_STYLE_CHOICES.find((s) => s.value === value);
      if (matched) {
        setMessages((current) => [...current, createMessage("user", matched.label)]);
        setDraft((current) => ({ ...current, stylePreset: matched.value as VideoStyleId }));
        askForPackage();
        return;
      }
    }

    if (step === "confirm") {
      if (value === "discount_code") {
        askForDiscountCode();
        return;
      }

      if (value === "create") {
        void createJobFromDraft();
        return;
      }

      if (value === "restart") {
        resetConversation();
      }
      return;
    }

    processUserText(value);
  }

  const packageConfig = selectedConfig
    ? getCinemaPackageConfig({
        packageType: draft.packageType,
        pricingMode: selectedConfig.pricingMode,
      })
    : null;

  const inputPlaceholder =
    step === "choose_experience"
      ? "Type studio name..."
      : step === "subject"
        ? selectedConfig?.subjectPlaceholder ?? "Video title..."
        : step === "token_address"
          ? selectedConfig?.subjectPlaceholder ?? "Token or wallet address..."
          : step === "description"
            ? selectedConfig?.subjectDescriptionPlaceholder ?? "Describe the visual and story..."
            : step === "style"
              ? "Pick a style..."
              : step === "chain"
              ? "Auto / Solana / Ethereum / BNB Chain / Base"
                : step === "package"
                  ? "30 sec or 60 sec"
                  : step === "discount_code"
                    ? "Enter discount code or type skip"
                  : step === "audio"
                    ? "yes or no"
                    : "Message";

  return (
    <section
      className={`panel concierge-panel${isWorkspaceMode ? " concierge-panel--workspace" : ""}`}
      id="concierge-chat"
    >
      <header className="concierge-header">
        <h2>{isWorkspaceMode ? "Create in chat" : "Start in chat"}</h2>
      </header>

      <div className="concierge-thread" ref={threadRef}>
        {messages.map((message) => (
          <article
            key={message.id}
            className={`concierge-bubble ${
              message.role === "assistant"
                ? "concierge-bubble-assistant"
                : "concierge-bubble-user"
            }`}
          >
            {!isWorkspaceMode ? (
              <span className="concierge-role">
                {message.role === "assistant"
                  ? message.agentName ?? persona.director
                  : "You"}
              </span>
            ) : null}
            <p>{message.text}</p>
          </article>
        ))}
      </div>

      {quickChoices.length ? (
        <div className="concierge-choices">
          {quickChoices.map((choice) => {
            const QuickChoiceIcon = quickChoiceIcon(choice.value);
            return (
              <button
                key={choice.value}
                type="button"
                className="button button-secondary concierge-choice"
                onClick={() => onChoiceClick(choice.value)}
                disabled={isCreating}
              >
                <QuickChoiceIcon className="button-icon" aria-hidden="true" />
                {choice.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {step !== "payment" ? (
        <form
          className="concierge-input-row"
          onSubmit={(event) => {
            event.preventDefault();
            processUserText(inputValue);
          }}
        >
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={inputPlaceholder}
            disabled={isCreating}
            aria-label="Chat input"
          />
          <button
            type="submit"
            className="button button-primary concierge-send"
            disabled={isCreating || !inputValue.trim()}
          >
            <SendIcon className="button-icon" aria-hidden="true" />
            Send
          </button>
        </form>
      ) : null}

      {error ? <p className="inline-error">{error}</p> : null}

      {jobPayment ? (
        <section className="concierge-payment">
          <div className="concierge-payment-head">
            <div>
              <p className="eyebrow">Payment</p>
              <h3>Complete checkout</h3>
            </div>
            <div className="button-row">
              <Link className="button button-secondary" href={`/job/${jobPayment.jobId}`}>
                <ArrowRightIcon className="button-icon" aria-hidden="true" />
                Open job
              </Link>
            </div>
          </div>

          {packageConfig ? (
            <p className="route-summary compact">
              {packageConfig.label} - {packageConfig.priceSol} SOL
            </p>
          ) : null}

          <div className="button-row">
            <MoonPayHostedPaymentButton
              amountSol={jobStatus?.payment?.amountSol ?? jobPayment.amountSol}
              jobId={jobPayment.jobId}
              paymentAddress={jobStatus?.payment?.paymentAddress ?? jobPayment.paymentAddress}
              label="Pay with MoonPay"
            />
          </div>

          <PaymentInstructionsCard
            jobId={jobPayment.jobId}
            amountSol={jobStatus?.payment?.amountSol ?? jobPayment.amountSol}
            paymentAddress={jobStatus?.payment?.paymentAddress ?? jobPayment.paymentAddress}
            receivedSol={jobStatus?.payment?.receivedSol}
            remainingSol={jobStatus?.payment?.remainingSol}
            statusText={statusLabel(
              jobStatus?.job?.status ?? jobStatus?.status,
              jobStatus?.job?.progress ?? jobStatus?.progress,
            )}
          />
        </section>
      ) : null}
    </section>
  );
}
