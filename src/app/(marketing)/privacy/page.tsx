import type { Metadata } from "next";
import Link from "next/link";

import { ContactLine, LegalPage } from "@/components/layout/legal-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${siteConfig.name} collects, uses and protects your data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 29, 2026">
      <p>
        {siteConfig.name} helps you practise speaking by recording you and giving AI feedback. That
        means we handle personal data, including recordings of your voice and, if you choose, your
        face. This page explains what we collect, why, who helps us process it and the control you
        have.
      </p>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and password. Passwords are
            stored only as a one-way hash, never in readable form.
          </li>
          <li>
            <strong>Profile and settings:</strong> your speaking goal, time zone and notification
            choices.
          </li>
          <li>
            <strong>Recordings:</strong> the audio, and video if you turn the camera on, of each
            practice session and follow-up answer.
          </li>
          <li>
            <strong>Results:</strong> transcripts of what you said, AI feedback, scores, streaks and
            achievements.
          </li>
          <li>
            <strong>Technical data:</strong> your IP address and browser type, used for security
            (sign-in protection, rate limiting) and to show you your active sessions.
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To run your account and sign you in securely.</li>
          <li>To transcribe your recordings and generate feedback on your speaking.</li>
          <li>To show your history, progress and achievements.</li>
          <li>
            To send the reminders and summaries you turn on, and account emails such as password
            reset links.
          </li>
          <li>To keep the service secure and prevent abuse.</li>
        </ul>
        <p className="mt-3">
          We don&apos;t sell your data, show ads or use your recordings to train our own AI models.
        </p>
      </section>

      <section>
        <h2>Who helps us process your data</h2>
        <p>We use a small number of service providers, who process data only on our behalf:</p>
        <ul>
          <li>
            <strong>Vercel:</strong> hosts the app and stores your recordings in private storage.
          </li>
          <li>
            <strong>Neon:</strong> hosts our database (account details, transcripts and results).
          </li>
          <li>
            <strong>Our AI provider (currently Groq):</strong> receives your audio and transcript to
            create the transcript and feedback.
          </li>
          <li>
            <strong>Our email provider:</strong> delivers our emails.
          </li>
          <li>
            <strong>Your browser&apos;s speech service (only if you turn on Live coach):</strong>{" "}
            transcribes your speech in real time to show filler words and pace while you record. In
            Chrome this is processed by Google. Live coach is off unless you switch it on.
          </li>
        </ul>
        <p className="mt-3">
          These providers may process data in the United States or other countries.
        </p>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your data while your account is open. You can delete a single recording or session
          at any time. When you delete your account, we permanently delete your profile, sessions,
          recordings, transcripts and feedback.
        </p>
      </section>

      <section>
        <h2>Your choices and rights</h2>
        <ul>
          <li>
            <strong>Download your data</strong> from{" "}
            <Link href="/settings" className="text-primary underline underline-offset-4">
              Settings
            </Link>{" "}
            (recordings excluded).
          </li>
          <li>
            <strong>Delete recordings, sessions or your whole account</strong> from the app at any
            time.
          </li>
          <li>
            <strong>Practise with voice only</strong> if you&apos;d rather not use your camera.
          </li>
          <li>
            <strong>Turn off emails</strong> in your notification settings.
          </li>
        </ul>
        <p className="mt-3">
          Depending on where you live, you may also have the right to access, correct or object to
          how we use your data, or to complain to your local data protection authority. To make a
          request, contact us at <ContactLine />.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Data is encrypted in transit. Recordings are kept in private storage and are only
          available to you after you sign in. No system is perfectly secure, but we work to protect
          your data and limit access to it.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          {siteConfig.name} isn&apos;t intended for children under 13, and we don&apos;t knowingly
          collect their data.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If we change this policy in a meaningful way, we&apos;ll update the date above and let you
          know in the app or by email. Questions? Contact us at <ContactLine />.
        </p>
      </section>
    </LegalPage>
  );
}
