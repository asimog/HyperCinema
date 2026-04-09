// Terms of Service
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | HyperMyths",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-[#e0e0e0]">
      <Link href="/" className="text-[#ffe500] font-mono text-sm hover:underline mb-8 inline-block">
        ← Back to HyperCinema
      </Link>

      <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: April 2026</p>

      <div className="space-y-8 font-mono text-sm leading-relaxed">
        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">1. The Service</h2>
          <p>
            Welcome to HyperMyths.com (&ldquo;HyperMyths&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;).
            These Terms of Service govern your access to and use of our website and AI-powered cinematic
            video generation service (the &ldquo;Service&rdquo;).
          </p>
          <p className="mt-2">
            HyperMyths allows users to generate short cinematic videos from text prompts using AI models
            (such as xAI Grok, Google Veo, and others). All generated videos are automatically posted
            publicly in our public feed channel and may be shared on associated automated X (formerly Twitter) accounts.
          </p>
          <p className="mt-2">
            You are solely responsible for the prompts you submit and for ensuring that any generated
            content complies with applicable laws and these Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">2. User Content and License</h2>
          <p>
            You retain ownership of the text prompts you provide. However, by submitting a prompt or
            generating a video, you grant us a worldwide, royalty-free, non-exclusive, sublicensable
            license to use, reproduce, modify, display, distribute, and publicly post the prompts and
            generated videos for the purpose of operating, improving, promoting, and providing the Service
            (including public display in our feed and on X).
          </p>
          <p className="mt-2">
            All generated videos are AI-created and posted publicly. You acknowledge that once posted,
            the content becomes publicly available and we cannot control third-party use or viewing.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">3. Acceptable Use and Prohibited Activities</h2>
          <p>You agree not to use the Service to create or promote content that:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
            <li>Violates any law or infringes third-party rights (including intellectual property)</li>
            <li>Is abusive, harassing, defamatory, violent, explicit, or harmful</li>
            <li>Constitutes spam, platform manipulation, or automated abuse on X or other platforms</li>
            <li>Attempts to circumvent safety filters or &ldquo;jailbreak&rdquo; AI models</li>
          </ul>
          <p className="mt-2">
            We reserve the right to reject prompts, delete videos, or suspend/terminate accounts that
            violate these rules. Automated posting on X must comply with X&rsquo;s Automation Rules,
            Developer Policy, and Terms of Service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">4. Accounts and Payments</h2>
          <p>
            Payments are processed via Solana blockchain (USDC or other supported tokens). All
            transactions are final and non-refundable.
          </p>
          <p className="mt-2">
            You must be at least 13 years old to use the Service (or the minimum age required in your jurisdiction).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">5. Automated X Account</h2>
          <p>
            We operate automated accounts on X that post generated videos. These accounts are clearly
            labeled as automated where required by X. The human operator is HyperMyths / Asimog (or
            the registered owner).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">6. Disclaimers</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo;. Generated videos may contain artifacts,
            inconsistencies, or unintended elements. We do not guarantee uniqueness, quality, or
            suitability for any purpose.
          </p>
          <p className="mt-2">
            We are not liable for any damages arising from your use of the Service or the public
            posting of generated content.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">7. Termination and Changes</h2>
          <p>
            We may suspend or terminate your access at any time for any reason. We may update these
            Terms; continued use after changes means you accept the new Terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">8. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which HyperMyths is registered.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-2">9. Contact</h2>
          <p>
            Questions? Reach us on X at{" "}
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
