"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PaymentInstructionsCard } from "@/components/PaymentInstructionsCard";
import { CrossmintHostedPaymentButton } from "@/components/payments/CrossmintHostedPaymentButton";
import {
  CINEMA_PAGE_CONFIGS,
  type CinemaPageId,
  getCinemaPackageConfig,
} from "@/lib/cinema/config";
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
  | "package"
  | "audio"
  | "confirm"
  | "payment";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type ConciergeDraft = {
  experienceId: CinemaPageId | null;
  subjectName: string;
  tokenAddress: string;
  chain: RequestedTokenChain;
  description: string;
  packageType: PackageType;
  audioEnabled: boolean;
};

interface CreateJobResponse {
  jobId: string;
  priceSol: number;
  paymentAddress: string;
  amountSol: number;
  tokenAddress?: string | null;
  chain?: RequestedTokenChain | null;
  subjectName?: string | null;
  subjectSymbol?: string | null;
  subjectImage?: string | null;
  stylePreset?: VideoStyleId | null;
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

const CONCIERGE_EXPERIENCES = [
  CINEMA_PAGE_CONFIGS.hashcinema,
  CINEMA_PAGE_CONFIGS.trenchcinema,
  CINEMA_PAGE_CONFIGS.funcinema,
  CINEMA_PAGE_CONFIGS.familycinema,
  CINEMA_PAGE_CONFIGS.musicvideo,
  CINEMA_PAGE_CONFIGS.recreator,
] as const;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "assistant-intro-1",
    role: "assistant",
    text: "Hi, I am your HyperCinema concierge. I will collect your video details, create the paid job, and track it until render starts.",
  },
  {
    id: "assistant-intro-2",
    role: "assistant",
    text: "First step: choose a studio.",
  },
];

function statusLabel(status?: string, progress?: string): string {
  if (status === "awaiting_payment") return "Awaiting payment";
  if (status === "payment_detected") return "Payment detected";
  if (status === "payment_confirmed") return "Payment confirmed";
  if (progress === "generating_report") return "Building story pack";
  if (progress === "generating_video") return "Rendering video";
  if (status === "processing") return "In render pipeline";
  if (status === "complete") return "Ready";
  if (status === "failed") return "Failed";
  return "Staging";
}

function crossmintProductLocator(input: {
  pricingMode: "public" | "private";
  packageType: PackageType;
}): string | undefined {
  if (input.pricingMode === "private") {
    return input.packageType === "1d"
      ? process.env.NEXT_PUBLIC_CROSSMINT_PRIVATE_30_PRODUCT
      : process.env.NEXT_PUBLIC_CROSSMINT_PRIVATE_60_PRODUCT;
  }

  return input.packageType === "1d"
    ? process.env.NEXT_PUBLIC_CROSSMINT_PUBLIC_30_PRODUCT
    : process.env.NEXT_PUBLIC_CROSSMINT_PUBLIC_60_PRODUCT;
}

function createMessage(role: "assistant" | "user", text: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
  };
}

function parseExperience(input: string): CinemaPageId | null {
  const normalized = input.toLowerCase().replace(/\s+/g, "");
  if (normalized.includes("hash")) return "hashcinema";
  if (normalized.includes("trench") || normalized.includes("token")) return "trenchcinema";
  if (normalized.includes("fun")) return "funcinema";
  if (normalized.includes("family") || normalized.includes("bedtime")) return "familycinema";
  if (normalized.includes("music")) return "musicvideo";
  if (normalized.includes("recreator") || normalized.includes("scene")) return "recreator";
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
  tokenFlow: boolean;
  pricingMode: "public" | "private";
}): string {
  const packageConfig = getCinemaPackageConfig({
    packageType: input.draft.packageType,
    pricingMode: input.pricingMode,
  });

  const summaryLines = [
    `Studio: ${input.configTitle}`,
    input.tokenFlow
      ? `Token address: ${input.draft.tokenAddress}`
      : `Title: ${input.draft.subjectName}`,
    input.tokenFlow ? `Chain: ${input.draft.chain}` : null,
    `Description: ${input.draft.description}`,
    `Runtime: ${packageConfig.videoSeconds} seconds`,
    `Audio: ${input.draft.audioEnabled ? "on" : "off"}`,
  ].filter(Boolean);

  return summaryLines.join("\n");
}

export function CinemaConciergeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [step, setStep] = useState<ConciergeStep>("choose_experience");
  const [draft, setDraft] = useState<ConciergeDraft>({
    experienceId: null,
    subjectName: "",
    tokenAddress: "",
    chain: "auto",
    description: "",
    packageType: "1d",
    audioEnabled: false,
  });
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [jobPayment, setJobPayment] = useState<CreateJobResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const lastPolledStatusRef = useRef<string | null>(null);

  const selectedConfig = useMemo(() => {
    if (!draft.experienceId) return null;
    return CINEMA_PAGE_CONFIGS[draft.experienceId];
  }, [draft.experienceId]);

  const paymentLocator = useMemo(() => {
    if (!selectedConfig) return undefined;
    return crossmintProductLocator({
      pricingMode: selectedConfig.pricingMode,
      packageType: draft.packageType,
    });
  }, [selectedConfig, draft.packageType]);

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
              createMessage("assistant", "Payment detected. Waiting for confirmation."),
            ]);
          }

          if (status === "payment_confirmed") {
            setMessages((current) => [
              ...current,
              createMessage("assistant", "Payment confirmed. Dispatching your video job now."),
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
  }, [jobPayment?.jobId]);

  const quickChoices = useMemo(() => {
    if (step === "choose_experience") {
      return CONCIERGE_EXPERIENCES.map((config) => ({
        value: config.id,
        label: config.title,
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
        { value: "create", label: "Generate paid job" },
        { value: "restart", label: "Start over" },
      ];
    }

    return [];
  }, [step]);

  function askForDescription() {
    setStep("description");
    setMessages((current) => [
      ...current,
      createMessage("assistant", "Now describe the visual direction and key beats."),
    ]);
  }

  function askForPackage() {
    setStep("package");
    setMessages((current) => [
      ...current,
      createMessage("assistant", "Choose runtime: 30 sec or 60 sec."),
    ]);
  }

  function openConfirmation(input: {
    nextDraft: ConciergeDraft;
    configTitle: string;
    tokenFlow: boolean;
    pricingMode: "public" | "private";
  }) {
    setStep("confirm");
    setMessages((current) => [
      ...current,
      createMessage("assistant", "Perfect. Review this brief:"),
      createMessage(
        "assistant",
        summaryText({
          configTitle: input.configTitle,
          draft: input.nextDraft,
          tokenFlow: input.tokenFlow,
          pricingMode: input.pricingMode,
        }),
      ),
      createMessage("assistant", "If this looks right, press Generate paid job."),
    ]);
  }

  function chooseExperience(experienceId: CinemaPageId) {
    const config = CINEMA_PAGE_CONFIGS[experienceId];
    const nextDraft: ConciergeDraft = {
      experienceId,
      subjectName: "",
      tokenAddress: "",
      chain: "auto",
      description: "",
      packageType: "1d",
      audioEnabled: config.audioMode === "required",
    };

    setDraft(nextDraft);
    setError(null);
    setJobPayment(null);
    setJobStatus(null);
    if (config.requestKind === "token_video") {
      setStep("token_address");
      setMessages((current) => [
        ...current,
        createMessage("assistant", "Paste the token contract or mint address."),
      ]);
      return;
    }

    setStep("subject");
    setMessages((current) => [
      ...current,
      createMessage("assistant", "Great. What should we call this video?"),
    ]);
  }

  function resetConversation() {
    setDraft({
      experienceId: null,
      subjectName: "",
      tokenAddress: "",
      chain: "auto",
      description: "",
      packageType: "1d",
      audioEnabled: false,
    });
    setStep("choose_experience");
    setMessages(INITIAL_MESSAGES);
    setInputValue("");
    setError(null);
    setJobPayment(null);
    setJobStatus(null);
    lastPolledStatusRef.current = null;
  }

  async function createJobFromDraft() {
    if (!selectedConfig) return;

    const tokenFlow = selectedConfig.requestKind === "token_video";
    if (tokenFlow && draft.tokenAddress.trim().length < 20) {
      setError("Please provide a valid token address.");
      return;
    }

    if (!tokenFlow && draft.subjectName.trim().length < 2) {
      setError("Please provide a valid title.");
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const body =
        selectedConfig.requestKind === "token_video"
          ? {
              requestKind: "token_video" as const,
              tokenAddress: draft.tokenAddress.trim(),
              chain: draft.chain,
              packageType: draft.packageType,
              stylePreset: selectedConfig.defaultStyle,
              subjectDescription: draft.description.trim() || undefined,
              requestedPrompt: draft.description.trim() || undefined,
              audioEnabled:
                selectedConfig.audioMode === "required" ? true : draft.audioEnabled,
              pricingMode: selectedConfig.pricingMode,
              visibility: selectedConfig.visibility,
              experience: selectedConfig.id,
            }
          : {
              requestKind: selectedConfig.requestKind,
              subjectName: draft.subjectName.trim(),
              subjectDescription: draft.description.trim() || undefined,
              packageType: draft.packageType,
              stylePreset: selectedConfig.defaultStyle,
              requestedPrompt: draft.description.trim() || undefined,
              audioEnabled:
                selectedConfig.audioMode === "required" ? true : draft.audioEnabled,
              pricingMode: selectedConfig.pricingMode,
              visibility: selectedConfig.visibility,
              experience: selectedConfig.id,
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

      setJobPayment(payload);
      setJobStatus({ status: "awaiting_payment", progress: "awaiting_payment" });
      setStep("payment");
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          "Job created. Complete payment below and I will keep tracking status.",
        ),
      ]);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Unexpected error while creating job.";
      setError(message);
      setMessages((current) => [...current, createMessage("assistant", message)]);
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
          createMessage("assistant", "Pick a studio from the chips so I can map the right flow."),
        ]);
        return;
      }

      chooseExperience(parsed);
      return;
    }

    if (!selectedConfig) {
      setMessages((current) => [
        ...current,
        createMessage("assistant", "Choose a studio first."),
      ]);
      setStep("choose_experience");
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
          createMessage("assistant", "That address looks too short. Please paste the full token address."),
        ]);
        return;
      }

      setDraft((current) => ({ ...current, tokenAddress: text }));
      setStep("chain");
      setMessages((current) => [
        ...current,
        createMessage("assistant", "Which chain should I use?"),
      ]);
      return;
    }

    if (step === "chain") {
      const parsedChain = parseChain(text);
      if (!parsedChain) {
        setMessages((current) => [
          ...current,
          createMessage("assistant", "Choose Auto, Solana, Ethereum, BNB Chain, or Base."),
        ]);
        return;
      }

      setDraft((current) => ({ ...current, chain: parsedChain }));
      askForDescription();
      return;
    }

    if (step === "description") {
      setDraft((current) => ({ ...current, description: text }));
      askForPackage();
      return;
    }

    if (step === "package") {
      const parsedPackage = parsePackage(text);
      if (!parsedPackage) {
        setMessages((current) => [
          ...current,
          createMessage("assistant", "Use 30 sec or 60 sec."),
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
        createMessage("assistant", "Do you want audio on?"),
      ]);
      return;
    }

    if (step === "audio") {
      const parsedAudio = parseAudio(text);
      if (parsedAudio === null) {
        setMessages((current) => [
          ...current,
          createMessage("assistant", "Please answer yes or no."),
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
      if (text.toLowerCase().includes("restart")) {
        resetConversation();
        return;
      }

      if (text.toLowerCase().includes("generate") || text.toLowerCase().includes("yes")) {
        void createJobFromDraft();
        return;
      }

      setMessages((current) => [
        ...current,
        createMessage("assistant", "Use Generate paid job or Start over."),
      ]);
      return;
    }
  }

  function onChoiceClick(value: string) {
    if (step === "choose_experience") {
      const config = CINEMA_PAGE_CONFIGS[value as CinemaPageId];
      setMessages((current) => [...current, createMessage("user", config.title)]);
      chooseExperience(value as CinemaPageId);
      return;
    }

    if (step === "confirm") {
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
        ? "Video title..."
        : step === "token_address"
          ? "Token address..."
          : step === "description"
            ? "Describe the visual and story..."
            : step === "chain"
              ? "Auto / Solana / Ethereum / BNB Chain / Base"
              : step === "package"
                ? "30 sec or 60 sec"
                : step === "audio"
                  ? "yes or no"
                  : "Message";

  return (
    <section className="panel concierge-panel" id="concierge-chat">
      <header className="concierge-header">
        <p className="eyebrow">Concierge</p>
        <h2>Build your video in chat</h2>
        <p className="route-summary">
          I ask for the required fields, create the job, and keep watching payment + render status.
        </p>
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
            <span className="concierge-role">
              {message.role === "assistant" ? "Agent" : "You"}
            </span>
            <p>{message.text}</p>
          </article>
        ))}
      </div>

      {quickChoices.length ? (
        <div className="concierge-choices">
          {quickChoices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className="button button-secondary concierge-choice"
              onClick={() => onChoiceClick(choice.value)}
              disabled={isCreating}
            >
              {choice.label}
            </button>
          ))}
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
            <CrossmintHostedPaymentButton
              productLocator={paymentLocator}
              label="Pay with Crossmint"
            />
          </div>

          <PaymentInstructionsCard
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
