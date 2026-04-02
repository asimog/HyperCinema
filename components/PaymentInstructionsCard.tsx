"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface PaymentInstructionsCardProps {
  amountSol: number;
  paymentAddress: string;
  receivedSol?: number;
  remainingSol?: number;
  statusText?: string;
}

function formatSol(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function fallbackCopy(value: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  return copied;
}

export function PaymentInstructionsCard(props: PaymentInstructionsCardProps) {
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const payableSol = props.remainingSol ?? props.amountSol;
  const payableAmount = formatSol(payableSol);
  const qrPayload = useMemo(
    () =>
      `solana:${props.paymentAddress}?amount=${encodeURIComponent(payableAmount)}`,
    [props.paymentAddress, payableAmount],
  );

  const copyPayload = [
    "HYPERCINEMA manual payment",
    `Address: ${props.paymentAddress}`,
    `Amount (SOL): ${payableAmount}`,
    "Network: Solana",
    "Send exactly the amount above.",
  ].join("\n");

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    setQrError(null);

    async function buildQrCode() {
      try {
        const QRCode = await import("qrcode");
        const dataUrl = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 256,
        });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setQrError(
            error instanceof Error ? error.message : "Failed to generate QR code.",
          );
        }
      }
    }

    void buildQrCode();
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  async function copy(label: string, value: string) {
    let copied = false;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      copied = fallbackCopy(value);
    }

    if (copied) {
      setCopySuccess(`${label} copied.`);
      setCopyError(null);
      return;
    }

    setCopySuccess(null);
    setCopyError("Clipboard copy failed. Please copy manually.");
  }

  return (
    <section className="cinema-panel grid gap-6 rounded-[2rem] p-6 md:grid-cols-[1fr,300px] md:p-7">
      <div className="space-y-4">
        <div>
          <p className="cinema-kicker text-[0.68rem] font-semibold">Payment Lock-In</p>
          <h2 className="font-display mt-2 text-3xl text-[#fff0da]">Manual send. Exact amount.</h2>
        </div>

        <p className="text-sm leading-relaxed text-[var(--muted)]">
          Copy the dedicated address and the exact amount below, then send from your
          wallet app. Once the chain confirms it, the job continues on its own.
        </p>

        <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[#f4dfc2]">
          Required amount:{" "}
          <span className="font-semibold text-[var(--accent-soft)]">
            {formatSol(props.amountSol)} SOL
          </span>
          {typeof props.receivedSol === "number" ? (
            <>
              {" | "}Received:{" "}
              <span className="font-semibold text-[#fff5e3]">
                {formatSol(props.receivedSol)} SOL
              </span>
            </>
          ) : null}
          {typeof props.remainingSol === "number" && props.remainingSol > 0 ? (
            <>
              {" | "}Remaining:{" "}
              <span className="font-semibold text-[#ffd789]">
                {formatSol(props.remainingSol)} SOL
              </span>
            </>
          ) : null}
        </p>

        <div className="rounded-[1.4rem] border border-white/10 bg-[#0d0a0c]/78 p-4">
          <p className="cinema-kicker text-[0.62rem] font-semibold">Payment Address</p>
          <p className="mt-2 break-all text-sm text-[#fff3dd]">{props.paymentAddress}</p>
          <button
            type="button"
            onClick={() => void copy("Address", props.paymentAddress)}
            className="cinema-secondary-button mt-3 rounded-xl px-3 py-2 text-xs font-medium transition"
          >
            Copy address
          </button>
        </div>

        <div className="rounded-[1.4rem] border border-white/10 bg-[#0d0a0c]/78 p-4">
          <p className="cinema-kicker text-[0.62rem] font-semibold">Amount (SOL)</p>
          <p className="mt-2 break-all font-display text-3xl text-[#fff1dc]">{payableAmount}</p>
          <button
            type="button"
            onClick={() => void copy("Amount", payableAmount)}
            className="cinema-secondary-button mt-3 rounded-xl px-3 py-2 text-xs font-medium transition"
          >
            Copy amount
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copy("Payment payload", copyPayload)}
            className="cinema-secondary-button inline-flex rounded-2xl px-4 py-3 text-sm font-medium transition"
          >
            Copy full payment instructions
          </button>
        </div>

        {props.statusText ? (
          <p className="text-sm text-[var(--muted)]">
            Status: <span className="font-semibold text-[var(--accent-cool)]">{props.statusText}</span>
          </p>
        ) : null}

        {copySuccess ? (
          <p className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {copySuccess}
          </p>
        ) : null}

        {copyError ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {copyError}
          </p>
        ) : null}
      </div>

      <div className="rounded-[1.6rem] border border-white/10 bg-[#0d0a0c]/78 p-4">
        <p className="cinema-kicker mb-3 text-[0.62rem] font-semibold">QR</p>
        {qrDataUrl ? (
          <div className="space-y-3">
            <Image
              src={qrDataUrl}
              alt="Payment QR code"
              width={224}
              height={224}
              unoptimized
              className="mx-auto h-56 w-56 rounded-2xl border border-white/10 bg-white p-3"
            />
            <p className="text-xs leading-relaxed text-[var(--muted)]">
              Scan in your Solana wallet app and verify both address and amount before
              sending anything.
            </p>
          </div>
        ) : qrError ? (
          <p className="text-sm leading-relaxed text-red-100">QR unavailable: {qrError}</p>
        ) : (
          <p className="text-sm leading-relaxed text-[var(--muted)]">Generating QR code...</p>
        )}
      </div>
    </section>
  );
}
