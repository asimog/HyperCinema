import Link from "next/link";

import { CredentialLoginCard } from "@/components/auth/CredentialLoginCard";
import { DiscountCodePanel } from "@/components/admin/DiscountCodePanel";
import { HyperflowAssemblyScaffold } from "@/components/shell/HyperflowAssemblyScaffold";
import { hasCockpitAccess } from "@/lib/admin/cockpit-auth";
import { listDiscountCodeAdminRecords } from "@/lib/jobs/repository";

export default async function DiscountCodesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const error = searchParams.error as string;
  const isAuthed = await hasCockpitAccess();

  if (!isAuthed) {
    const errorMessage =
      error === "invalid" ? "Invalid username or password. Please try again." : undefined;

    return (
      <CredentialLoginCard
        title="Open the cockpit"
        summary="Enter the cockpit credentials to manage discount codes."
        error={errorMessage}
      />
    );
  }

  const records = await listDiscountCodeAdminRecords();

  const leftRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">HyperMyths Cockpit</p>
            <h2>Discount codes</h2>
          </div>
        </div>
        <p className="route-summary">
          View the three built-in codes, see which ones have been consumed, and issue new
          one-time codes into Firestore.
        </p>
      </section>
    </div>
  );

  const rightRail = (
    <div className="rail-stack">
      <section className="panel rail-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Shortcuts</p>
            <h2>Quick links</h2>
          </div>
        </div>
        <div className="button-row">
          <Link href="/admin/moderation" className="button button-secondary">
            Moderation
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
              <h1>Discount code cockpit</h1>
            </div>
          </div>
        </section>
        <DiscountCodePanel records={records} />
      </HyperflowAssemblyScaffold>
    </div>
  );
}
