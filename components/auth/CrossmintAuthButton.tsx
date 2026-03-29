"use client";

import { useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

function userLabel(user: unknown): string {
  if (!user || typeof user !== "object") {
    return "Private viewer";
  }

  const record = user as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email : null;
  const username = typeof record.username === "string" ? record.username : null;
  const id = typeof record.id === "string" ? record.id : null;
  return email ?? username ?? id ?? "Private viewer";
}

export function CrossmintAuthButton() {
  const auth = useCrossmintAuth();

  if (!auth || !process.env.NEXT_PUBLIC_CROSSMINT_API_KEY) {
    return null;
  }

  if (auth.status === "logged-in") {
    return (
      <div className="auth-pill">
        <span>{userLabel(auth.user)}</span>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => void auth.logout()}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="button button-secondary"
      onClick={() => auth.login()}
      disabled={auth.status === "in-progress" || auth.status === "initializing"}
    >
      {auth.status === "in-progress" || auth.status === "initializing"
        ? "Opening login..."
        : "Crossmint login"}
    </button>
  );
}

