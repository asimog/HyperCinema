"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { WalletIcon } from "@/components/ui/AppIcons";
import { buildMoonpayButtonConfig } from "@/lib/payments/moonpay-client";

declare global {
  interface Window {
    helioCheckout?: (element: HTMLElement, config: Record<string, unknown>) => void;
  }
}

async function requestMoonpayStart(jobId: string): Promise<{
  ok: boolean;
  status: number;
  message: string | null;
}> {
  const response = await fetch(`/api/jobs/${jobId}/moonpay/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  let message: string | null = null;
  try {
    const payload = (await response.json()) as {
      message?: string;
      error?: string;
    };
    message = payload.message ?? payload.error ?? null;
  } catch {
    message = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    message,
  };
}

export function MoonPayHostedPaymentButton(input: {
  amountSol: number;
  jobId: string;
  paymentAddress: string;
  label: string;
  themeMode?: "light" | "dark";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const checkoutConfig = useMemo(
    () =>
      buildMoonpayButtonConfig({
        amountSol: input.amountSol,
        jobId: input.jobId,
        paymentAddress: input.paymentAddress,
        label: input.label,
        themeMode: input.themeMode,
        onSuccess: (event) => {
          console.log(event);
          setStatusText("Payment received. Finalizing job dispatch...");
          void requestMoonpayStart(input.jobId)
            .then((result) => {
              if (result.ok) {
                setStatusText("Payment confirmed. Dispatching your job now.");
                return;
              }

              setStatusText(
                result.message ?? "Payment received. Waiting for confirmation...",
              );
            })
            .catch(() => {
              setStatusText("Payment received. Waiting for confirmation...");
            });
        },
        onError: (event) => {
          console.log(event);
        },
        onPending: (event) => {
          console.log(event);
          setStatusText("Payment pending...");
        },
        onCancel: () => {
          console.log("Cancelled payment");
          setStatusText("Payment cancelled.");
        },
        onStartPayment: () => {
          console.log("Starting payment");
          setStatusText("Opening MoonPay...");
        },
      }),
    [input.amountSol, input.jobId, input.label, input.paymentAddress, input.themeMode],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !checkoutConfig) return;

    let cancelled = false;
    const scriptId = "moonpay-commerce-checkout-widget";

    async function initialize() {
      setLoadError(null);

      const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
      const script =
        existing ??
        Object.assign(document.createElement("script"), {
          id: scriptId,
          type: "module",
          crossOrigin: "anonymous",
          src: "https://embed.hel.io/assets/index-v1.js",
        });

      const mount = () => {
        if (cancelled || !container || !window.helioCheckout || !checkoutConfig) {
          return;
        }

        container.innerHTML = "";
        window.helioCheckout(container, checkoutConfig);
      };

      if (!existing) {
        await new Promise<void>((resolve, reject) => {
          script.addEventListener("load", () => resolve(), { once: true });
          script.addEventListener(
            "error",
            () => reject(new Error("Failed to load MoonPay Commerce checkout.")),
            { once: true },
          );
          document.head.appendChild(script);
        });
      } else if (!window.helioCheckout) {
        await new Promise<void>((resolve, reject) => {
          script.addEventListener("load", () => resolve(), { once: true });
          script.addEventListener(
            "error",
            () => reject(new Error("Failed to load MoonPay Commerce checkout.")),
            { once: true },
          );
        });
      }

      mount();
    }

    void initialize().catch((error) => {
      if (!cancelled) {
        setLoadError(error instanceof Error ? error.message : "Failed to load MoonPay Commerce.");
      }
    });

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [checkoutConfig]);

  if (!checkoutConfig) {
    return null;
  }

  return (
    <div className="moonpay-checkout w-full">
      <div
        id="helioCheckoutContainer"
        ref={containerRef}
        className="moonpay-checkout-host min-h-[3.5rem] w-full"
        aria-label="MoonPay hosted checkout"
      />
      {loadError ? <p className="mt-2 text-sm text-red-100">{loadError}</p> : null}
      {statusText ? <p className="mt-2 text-xs text-[var(--muted)]">{statusText}</p> : null}
      <p className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--muted)]">
        <WalletIcon className="button-icon" aria-hidden="true" />
        Powered by MoonPay Commerce
      </p>
    </div>
  );
}
