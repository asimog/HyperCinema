"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { DiscountCodeAdminRecord } from "@/lib/jobs/repository";

function formatRelativeStatus(record: DiscountCodeAdminRecord): string {
  if (record.isConsumed) {
    return `Consumed${record.usedByJobId ? ` by ${record.usedByJobId}` : ""}`;
  }

  return "Available";
}

export function DiscountCodePanel({
  records,
}: {
  records: DiscountCodeAdminRecord[];
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const consumedCount = useMemo(
    () => records.filter((record) => record.isConsumed).length,
    [records],
  );

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCode(value);
      window.setTimeout(() => setCopiedCode(null), 1_200);
    } catch {
      setError("Clipboard copy failed.");
    }
  }

  async function issueCode() {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim() || undefined,
          label: label.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string; code?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to issue discount code.");
      }

      setCode("");
      setLabel("");
      setSuccess(`Issued ${payload.code ?? "new code"}.`);
      router.refresh();
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "Failed to issue discount code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Discount Codes</p>
            <h2>Issue a new code</h2>
          </div>
        </div>

        <p className="route-summary">
          Leave the code blank to generate one automatically, or type your own alphanumeric
          code and save it to Firestore.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr,1fr,auto] md:items-end">
          <label className="field">
            <span>Custom code</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Leave blank to generate"
              disabled={pending}
            />
          </label>
          <label className="field">
            <span>Label / note</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Optional label"
              disabled={pending}
            />
          </label>
          <button
            type="button"
            onClick={() => void issueCode()}
            className="button button-secondary whitespace-nowrap md:self-end"
            disabled={pending}
          >
            {pending ? "Issuing..." : "Issue code"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {success ? <p className="inline-note">{success}</p> : null}
          {error ? <p className="inline-error">{error}</p> : null}
          {copiedCode ? <p className="inline-note">Copied {copiedCode}.</p> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Consumption</p>
            <h2>
              {consumedCount} consumed / {records.length} total
            </h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => (
            <article key={record.code} className="surface-card module-tile">
              <p className="eyebrow">
                {record.origin} - {record.isConsumed ? "used" : "unused"}
              </p>
              <h3 className="text-2xl tracking-wide">{record.code}</h3>
              <p className="route-summary compact">{record.label ?? "No label"}</p>
              <div className="module-preview">
                <span>Status</span>
                <strong>{formatRelativeStatus(record)}</strong>
              </div>
              <div className="module-preview">
                <span>Issued</span>
                <strong>
                  {record.createdAt ? new Date(record.createdAt).toLocaleString() : "Built-in"}
                </strong>
              </div>
              <div className="module-preview">
                <span>Used</span>
                <strong>{record.usedAt ? new Date(record.usedAt).toLocaleString() : "Never"}</strong>
              </div>
              <button
                type="button"
                className="button button-secondary mt-4"
                onClick={() => void copy(record.code)}
              >
                Copy code
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
