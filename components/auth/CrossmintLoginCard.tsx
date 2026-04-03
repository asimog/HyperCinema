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
          <p className="eyebrow">Private Gate</p>
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
            Private jobs stay out of the public gallery and receive the private studio rate.
          </p>
        </article>
        <article className="mini-item-card">
          <div>
            <span>Status</span>
            <strong>{enabled ? "Crossmint configured" : "Crossmint env missing"}</strong>
          </div>
          <p className="route-summary compact">
            Set `NEXT_PUBLIC_CROSSMINT_API_KEY` and `CROSSMINT_SERVER_API_KEY` to turn the
            private studio flow on in production.
          </p>
        </article>
      </div>
      <div className="button-row">
        <CrossmintAuthButton />
      </div>
    </section>
  );
}

