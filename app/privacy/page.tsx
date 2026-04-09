// Privacy Policy
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | HyperMyths",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-[#e0e0e0]">
      <Link href="/" className="text-[#ffe500] font-mono text-sm hover:underline mb-8 inline-block">
        ← Back to HyperCinema
      </Link>

      <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: April 2026</p>

      <div className="space-y-8 font-mono text-sm leading-relaxed">
        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li><strong className="text-white">Account Information:</strong> Email and authentication data (via Firebase or similar).</li>
            <li><strong className="text-white">Prompts and Generated Content:</strong> Text prompts you submit and the resulting AI-generated videos.</li>
            <li><strong className="text-white">Usage Data:</strong> IP address, device information, and service usage metrics.</li>
            <li><strong className="text-white">Payment Data:</strong> Blockchain transaction details (we do not store full wallet keys or sensitive payment info).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>Generate and process your video requests</li>
            <li>Post generated videos publicly in our feed and on associated X accounts</li>
            <li>Improve our AI models and Service (we may use anonymized or aggregated prompts for training)</li>
            <li>Manage accounts, process payments, and provide customer support</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">3. Public Nature of Content</h2>
          <p>
            All videos generated on HyperMyths are posted <strong className="text-white">publicly</strong>.
            By generating a video, you consent to its public display on our platform, feed, and automated
            X channels. Once public, we cannot prevent others from viewing, sharing, or using the content.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">4. Sharing Your Information</h2>
          <p>We may share data with:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
            <li>Third-party AI providers (e.g., xAI, Google Veo) necessary to generate videos</li>
            <li>Hosting, analytics, and payment processing providers</li>
            <li>As required by law or to enforce our Terms</li>
          </ul>
          <p className="mt-2">
            We do not sell personal data. Publicly posted videos are visible to anyone.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">5. Automated X Posting</h2>
          <p>
            We use the X API to automatically post generated videos from labeled automated accounts.
            This activity complies with X&rsquo;s Developer Agreement, Developer Policy, and Automation Rules.
            The automated accounts clearly indicate they are bot-operated and are managed by the HyperMyths team.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">6. Your Rights and Data Retention</h2>
          <p>
            You may request deletion of your account and associated data (we may retain certain information
            as required by law or for legitimate business purposes). Publicly posted videos may remain
            visible even after account deletion.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">7. Security and Children&rsquo;s Privacy</h2>
          <p>
            We use reasonable security measures, but no system is 100% secure. Our Service is not directed
            at children under 13. We do not knowingly collect data from children under 13.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy. Material changes will be posted on our website.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">9. Contact Us</h2>
          <p>
            For questions about this Privacy Policy, reach us on X at{" "}
            <a href="https://x.com/HyperMythX" target="_blank" rel="noopener noreferrer" className="text-[#ffe500] hover:underline">
              @HyperMythsX
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
