"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { CrossmintAuthButton } from "@/components/auth/CrossmintAuthButton";
import { useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

export function LoginPageClient({ next }: { next: string }) {
  const auth = useCrossmintAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth?.status === "logged-in") {
      router.push(next);
    }
  }, [auth?.status, next, router]);

  const isLoggedIn = auth?.status === "logged-in";
  const inProgress = auth?.status === "in-progress" || auth?.status === "initializing";

  return (
    <div className="cinema-shell cinema-noise min-h-dvh overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <section className="panel gate-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Private Cinema</p>
            <h2>Sign in to HyperMyths</h2>
          </div>
        </div>
        <p className="route-summary">
          Login is optional. Sign in if you want your renders kept private and out of the public
          gallery.
        </p>
        <div className="mini-list">
          <article className="mini-item-card">
            <div>
              <span>Without login</span>
              <strong>Videos go to public gallery</strong>
            </div>
            <p className="route-summary compact">
              All tools are freely usable. Completed renders appear in the shared gallery.
            </p>
          </article>
          <article className="mini-item-card">
            <div>
              <span>With login</span>
              <strong>Videos stay private</strong>
            </div>
            <p className="route-summary compact">
              Family and music projects stay private by default.
            </p>
          </article>
        </div>
        <div className="button-row">
          {isLoggedIn ? (
            <p className="route-summary compact">You&apos;re signed in, redirecting...</p>
          ) : (
            <CrossmintAuthButton />
          )}
          {!inProgress && !isLoggedIn && (
            <Link href="/" className="button button-secondary">
              Continue without login
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
