"use client";

import { CrossmintAuthButton } from "@/components/auth/CrossmintAuthButton";

export function CrossmintLoginCard(input: {
  title: string;
  summary: string;
}) {
  const enabled = Boolean(process.env.NEXT_PUBLIC_CROSSMINT_API_KEY);

  return (
    <section className="panel gate-panel grid gap-5">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Private access</p>
          <h2>{input.title}</h2>
        </div>
      </div>
      <p className="route-summary">{input.summary}</p>
      <div className="mini-list">
        <article className="mini-item-card">
          <div>
            <span>Access</span>
            <strong>Crossmint login required</strong>
          </div>
          <p className="route-summary compact">
            Private jobs stay out of public discovery and use the private studio flow.
          </p>
        </article>
        <article className="mini-item-card">
          <div>
            <span>Status</span>
            <strong>{enabled ? "Ready" : "Setup required"}</strong>
          </div>
          <p className="route-summary compact">
            Crossmint keys are required before private sign-in can be turned on in production.
          </p>
        </article>
      </div>
      <div className="button-row">
        <CrossmintAuthButton />
      </div>
    </section>
  );
}

