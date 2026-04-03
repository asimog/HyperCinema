import Link from "next/link";

import { CredentialLoginCard } from "@/components/auth/CredentialLoginCard";
import { HyperflowAssemblyScaffold } from "@/components/shell/HyperflowAssemblyScaffold";
import { hasCockpitAccess } from "@/lib/admin/cockpit-auth";
import { getInferenceRuntimeConfig } from "@/lib/inference/config";
import {
  TEXT_INFERENCE_PROVIDER_OPTIONS,
  VIDEO_INFERENCE_PROVIDER_OPTIONS,
} from "@/lib/inference/providers";
import { InferenceConfigPanel } from "@/components/admin/InferenceConfigPanel";

export default async function InferencePage() {
  const isAuthed = await hasCockpitAccess();

  if (!isAuthed) {
    return (
      <CredentialLoginCard
        title="Open the cockpit"
        summary="Enter the cockpit credentials to manage inference providers."
      />
    );
  }

  const config = await getInferenceRuntimeConfig();

  const leftRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">HyperMyths Cockpit</p>
            <h2>Inference routing</h2>
          </div>
        </div>
        <p className="route-summary">
          Switch the active text and video providers without editing deployment code. Keep API
          keys in env vars and use this cockpit to move between models.
        </p>
      </section>
    </div>
  );

  const rightRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Quick links</p>
            <h2>Cockpit</h2>
          </div>
        </div>
        <div className="button-row">
          <Link href="/admin/moderation" className="button button-secondary">
            Moderation
          </Link>
          <Link href="/admin/discount-codes" className="button button-secondary">
            Discount codes
          </Link>
          <Link href="/" className="button button-secondary">
            Home
          </Link>
        </div>
        <form action="/api/cockpit/logout" method="POST" style={{ marginTop: "0.75rem" }}>
          <button type="submit" className="button button-secondary">
            Log out
          </button>
        </form>
      </section>
    </div>
  );

  return (
    <div className="cinema-shell cinema-noise min-h-[100dvh] overflow-hidden px-4 py-6 text-[#fff1dc] md:px-8 md:py-8">
      <HyperflowAssemblyScaffold leftRail={leftRail} rightRail={rightRail}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h1>Inference cockpit</h1>
            </div>
          </div>
        </section>
        <InferenceConfigPanel
          initialConfig={config}
          textOptions={TEXT_INFERENCE_PROVIDER_OPTIONS}
          videoOptions={VIDEO_INFERENCE_PROVIDER_OPTIONS}
        />
      </HyperflowAssemblyScaffold>
    </div>
  );
}

