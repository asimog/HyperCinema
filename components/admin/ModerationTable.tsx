"use client";

import { useState } from "react";

type ModerationItem = {
  jobId: string;
  title: string;
  summary: string;
  experience: string;
  visibility: string;
  moderationStatus: string;
};

export function ModerationTable({ items }: { items: ModerationItem[] }) {
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(jobId: string, moderationStatus: "visible" | "flagged" | "hidden") {
    setPendingJobId(jobId);
    setError(null);

    try {
      const response = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          moderationStatus,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to update moderation state.");
      }

      window.location.reload();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unknown error");
    } finally {
      setPendingJobId(null);
    }
  }

  return (
    <div className="moderation-grid">
      {items.map((item) => (
        <article key={item.jobId} className="surface-card module-tile">
          <p className="eyebrow">
            {item.experience} · {item.visibility}
          </p>
          <h2>{item.title}</h2>
          <p>{item.summary}</p>
          <div className="module-preview">
            <span>Status</span>
            <strong>{item.moderationStatus}</strong>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void update(item.jobId, "visible")}
              disabled={pendingJobId === item.jobId}
            >
              Show
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void update(item.jobId, "flagged")}
              disabled={pendingJobId === item.jobId}
            >
              Flag
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void update(item.jobId, "hidden")}
              disabled={pendingJobId === item.jobId}
            >
              Hide
            </button>
          </div>
        </article>
      ))}
      {error ? <p className="inline-error">{error}</p> : null}
    </div>
  );
}
