"use client";

import {
  CrossmintAuthProvider,
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
      <CrossmintAuthProvider
        refreshRoute="/api/crossmint/refresh"
        logoutRoute="/api/crossmint/logout"
        loginMethods={["email", "google"]}
        authModalTitle="Sign in to open private cinema"
      >
        <CrossmintCheckoutProvider>{children}</CrossmintCheckoutProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}

