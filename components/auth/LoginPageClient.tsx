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
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#f4efe8] md:px-8 md:py-8">
      <div className="home-stage">
        <div className="home-stage-backdrop" aria-hidden="true" />
        <div className="relative z-10 mx-auto w-full max-w-2xl">
          <section className="panel gate-panel grid gap-5">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Private access</p>
                <h2>Sign in to HyperMyths</h2>
              </div>
            </div>
            <p className="route-summary">
              Sign in if you want your finished videos kept private and visible only to you.
            </p>
            <div className="mini-list">
              <article className="mini-item-card">
                <div>
                  <span>Without login</span>
                  <strong>Videos can appear publicly</strong>
                </div>
                <p className="route-summary compact">
                  All tools stay available. Finished videos may appear in the public gallery.
                </p>
              </article>
              <article className="mini-item-card">
                <div>
                  <span>With login</span>
                  <strong>Videos stay private</strong>
                </div>
                <p className="route-summary compact">
                  Private projects stay tied to your account and out of public discovery.
                </p>
              </article>
            </div>
            <div className="button-row">
              {isLoggedIn ? (
                <p className="route-summary compact">You&apos;re signed in. Redirecting now...</p>
              ) : (
                <CrossmintAuthButton />
              )}
              {!inProgress && !isLoggedIn && (
                <Link href="/" className="button button-secondary">
                  Continue without signing in
                </Link>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
