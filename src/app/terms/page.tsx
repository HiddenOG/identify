import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, DocPage } from "@/components/doc-page";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Use", description: `The rules for using ${SITE_NAME}.` };

export default function TermsPage() {
  return (
    <DocPage title="Terms of Use" updated="October 29, 2026" intro={`The ground rules for using ${SITE_NAME}. Plain English, short.`}>
      <h2>Your account</h2>
      <ul>
        <li>You need to be at least 16 to create an account.</li>
        <li>Keep your sign-in details safe; you&apos;re responsible for activity on your account.</li>
        <li>Use your real identity. Don&apos;t impersonate another person or company.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You own what you post: your CV, projects, images and comments. By posting it, you give {SITE_NAME} permission to store
        it, display it on the site and show it to visitors, for as long as it&apos;s up. Delete it and that permission ends (copies in
        backups may take a short while to disappear).
      </p>
      <p>Only post work you have the right to share, and be honest about your part in it.</p>

      <h2>What&apos;s not allowed</h2>
      <ul>
        <li>False or misleading CVs, credentials or project claims.</li>
        <li>Harassment, hate, threats, or sharing someone else&apos;s private information.</li>
        <li>Spam, unsolicited bulk messages, or scraping people&apos;s data.</li>
        <li>Malware, phishing, or anything illegal.</li>
        <li>Trying to break, overload or get around the security of the site.</li>
      </ul>

      <h2>Messages and recruiting</h2>
      <p>
        Private messages are for genuine contact: collaboration, feedback and hiring. Recruiters may use profiles to find
        candidates, but not to build mailing lists or resell people&apos;s details.
      </p>

      <h2>Our part</h2>
      <p>
        We work to keep {SITE_NAME} running and your data safe, but the service is provided as is, without guarantees that it
        will always be available or error-free. We may remove content or suspend accounts that break these terms.
      </p>

      <h2>Leaving</h2>
      <p>
        You can stop using {SITE_NAME} and delete your account at any time in <Link href="/settings">Settings → Account</Link>.
      </p>

      <h2>Changes</h2>
      <p>
        If these terms change in a meaningful way, we&apos;ll update the date above and let members know. Our{" "}
        <Link href="/privacy">Privacy Policy</Link> explains how we handle your data.
      </p>

      <ContactLine topic="these terms" />
    </DocPage>
  );
}
