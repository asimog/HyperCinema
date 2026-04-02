"use client";

import { CrossmintHostedCheckout } from "@crossmint/client-sdk-react-ui";

import { WalletIcon } from "@/components/ui/AppIcons";

export function CrossmintHostedPaymentButton(input: {
  productLocator?: string | null;
  theme?: "dark" | "light" | "crossmint";
  label: string;
}) {
  if (!input.productLocator || !process.env.NEXT_PUBLIC_CROSSMINT_API_KEY) {
    return null;
  }

  return (
    <CrossmintHostedCheckout
      className="button button-secondary"
      lineItems={[
        {
          productLocator: input.productLocator,
        },
      ]}
      payment={{
        defaultMethod: "fiat",
        fiat: {
          enabled: true,
        },
        crypto: {
          enabled: true,
        },
      }}
      appearance={{
        display: "popup",
        theme: {
          button: input.theme ?? "crossmint",
          checkout: "dark",
        },
        variables: {
          colors: {
            accent: "#9bc8c0",
          },
        },
      }}
      >
      <span className="inline-flex items-center gap-2">
        <WalletIcon className="button-icon" aria-hidden="true" />
        {input.label}
      </span>
    </CrossmintHostedCheckout>
  );
}

