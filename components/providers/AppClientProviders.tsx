"use client";

import {
  CrossmintCheckoutProvider,
  CrossmintProvider,
} from "@crossmint/client-sdk-react-ui";
import { ReactNode } from "react";

export function AppClientProviders({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY;

  if (!apiKey) {
    return <>{children}</>;
  }

  return (
    <CrossmintProvider apiKey={apiKey}>
      <CrossmintCheckoutProvider>{children}</CrossmintCheckoutProvider>
    </CrossmintProvider>
  );
}

