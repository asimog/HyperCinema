type MoonpayCheckoutCallbacks = {
  onSuccess?: (event: unknown) => void;
  onError?: (event: unknown) => void;
  onPending?: (event: unknown) => void;
  onCancel?: () => void;
  onStartPayment?: () => void;
};

export function buildMoonpayButtonConfig(input: {
  amountSol: number;
  jobId: string;
  paymentAddress: string;
  label: string;
  themeMode?: "light" | "dark";
} & MoonpayCheckoutCallbacks) {
  const paylinkId = process.env.NEXT_PUBLIC_MOONPAY_PAYLINK_ID?.trim();
  const network = process.env.NEXT_PUBLIC_MOONPAY_NETWORK?.trim();
  if (!paylinkId) return null;

  const amount = Number.isFinite(input.amountSol) ? input.amountSol : 0;
  const formattedAmount = amount.toFixed(6).replace(/\.?0+$/, "");

  return {
    paylinkId,
    amount: formattedAmount,
    display: "inline" as const,
    primaryPaymentMethod: "fiat" as const,
    ...(network === "main" || network === "test" ? { network } : {}),
    theme: {
      themeMode: input.themeMode ?? "dark",
    },
    primaryColor: "#6400CC",
    neutralColor: "#5A6578",
    customTexts: {
      mainButtonTitle: input.label,
      payButtonTitle: "Continue to MoonPay",
    },
    onSuccess: input.onSuccess,
    onError: input.onError,
    onPending: input.onPending,
    onCancel: input.onCancel,
    onStartPayment: input.onStartPayment,
    additionalJSON: {
      jobId: input.jobId,
      paymentAddress: input.paymentAddress,
      amountSol: formattedAmount,
    },
  };
}
