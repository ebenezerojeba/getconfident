import type { Metadata } from "next";
import Link from "next/link";

import { ContactLine, LegalPage } from "@/components/layout/legal-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms for using ${siteConfig.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="October 28, 2026">
      <p>
        These terms apply when you use {siteConfig.name}. By creating an account, you agree to them.
        Please also read our{" "}
        <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
          privacy policy
        </Link>
        .
      </p>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>You must be at least 13 years old to use {siteConfig.name}.</li>
          <li>Give accurate details and keep your password secure.</li>
          <li>You&apos;re responsible for activity on your account.</li>
        </ul>
      </section>

      <section>
        <h2>Your content</h2>
        <p>
          Your recordings and transcripts belong to you. You give us permission to store and process
          them only to provide the service, for example to transcribe them and give you feedback.
          You can delete them at any time.
        </p>
        <p className="mt-3">Only record yourself, or people who have agreed to be recorded.</p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>Please don&apos;t:</p>
        <ul>
          <li>break the law or record people without their consent;</li>
          <li>upload harmful, hateful or illegal content;</li>
          <li>try to access other people&apos;s accounts or data, or disrupt the service;</li>
          <li>scrape, overload or reverse-engineer the service.</li>
        </ul>
        <p className="mt-3">We may suspend accounts that break these rules.</p>
      </section>

      <section>
        <h2>AI feedback</h2>
        <p>
          Feedback, scores and transcripts are generated automatically and can be wrong or
          incomplete. They&apos;re practice aids, not professional, medical or career advice.
        </p>
      </section>

      <section>
        <h2>The service</h2>
        <p>
          We work to keep {siteConfig.name} running well, but it&apos;s provided &quot;as is&quot;,
          without guarantees that it will always be available or error-free. We may change or
          discontinue features. To the extent the law allows, we aren&apos;t liable for indirect
          losses arising from your use of the service.
        </p>
      </section>

      <section>
        <h2>Ending your account</h2>
        <p>
          You can delete your account at any time from Settings, which permanently deletes your
          data. We may close accounts that break these terms.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          We may update these terms. If the changes are significant, we&apos;ll let you know before
          they apply. Questions? Contact us at <ContactLine />.
        </p>
      </section>
    </LegalPage>
  );
}
