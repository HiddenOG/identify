import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, DocPage } from "@/components/doc-page";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", description: `How ${SITE_NAME} handles your data.` };

export default function PrivacyPage() {
  return (
    <DocPage
      title="Privacy Policy"
      updated="October 29, 2026"
      intro={`What ${SITE_NAME} collects, what's public, what's private, and how to remove it.`}
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address and password (stored hashed by our authentication provider), or
          your name, email and photo from Google or GitHub if you sign in with one of them.
        </li>
        <li>
          <strong>Profile and CV:</strong> your username, name, headline, location, photo, CV content, theme and whether
          you&apos;re open to work.
        </li>
        <li>
          <strong>Content you post:</strong> projects (including drafts), images, comments and likes.
        </li>
        <li>
          <strong>Connections and activity:</strong> who you follow, projects you save to your Library, notifications, and private
          messages.
        </li>
        <li>
          <strong>Basic usage stats:</strong> when a project is opened (a view) or read to the end (a read), so authors can see
          their numbers. We count each person once per project per day and don&apos;t record what else you do.
        </li>
      </ul>

      <h2>What&apos;s public and what&apos;s private</h2>
      <ul>
        <li>
          <strong>Public:</strong> your profile and CV page, published projects, comments, likes and follower counts. Anyone can
          view them; downloading a CV as a PDF requires an account.
        </li>
        <li>
          <strong>Only you:</strong> your email, drafts, Library, notifications and stats.
        </li>
        <li>
          <strong>Only the two people in a conversation:</strong> private messages. The database itself enforces this.
        </li>
      </ul>

      <h2>CV uploads and AI</h2>
      <p>
        When you upload a CV to fill in your profile, we read the text out of the file and, if AI is enabled, send that text to
        an AI provider to sort it into fields. The file itself isn&apos;t stored. Nothing is saved to your profile until you review
        it and press Save.
      </p>

      <h2>Profile photos</h2>
      <p>
        When you upload a profile photo, its background is removed by an AI model that runs in your own browser, so the photo
        isn&apos;t sent to any AI service. Only the finished cut-out is uploaded to your profile. You can turn this off before
        uploading.
      </p>

      <h2>Discover listings</h2>
      <p>
        Discover features personal portfolio websites we think deserve to be seen, including some whose owners aren&apos;t on{" "}
        {SITE_NAME} yet. These listings are picked by people, not collected by a crawler. A listing shows only the person&apos;s
        name, role, location, a link to their site and the preview image their site publishes for sharing; we don&apos;t copy
        their work. We only read sites whose robots.txt allows it, and we only keep an email address the person publishes for
        contact, never shown publicly.
      </p>
      <p>
        Every listing its owner hasn&apos;t claimed has an &ldquo;Is this you?&rdquo; link. It leads to a page where the owner can
        claim the listing for free, or remove it without an account: it comes down at once, and we won&apos;t contact that
        person again.
      </p>

      <h2>Cookies and local storage</h2>
      <ul>
        <li>
          <strong>Sign-in cookies</strong> keep you logged in.
        </li>
        <li>
          <strong>An anonymous visitor ID</strong> lets us count views from signed-out readers once per day. It isn&apos;t linked to
          who you are.
        </li>
        <li>
          <strong>A short-lived cookie</strong> remembers the username you claimed while you sign up.
        </li>
        <li>
          <strong>Your browser&apos;s local storage</strong> remembers your light/dark choice and whether the sidebar is open.
        </li>
      </ul>
      <p>We don&apos;t use advertising or third-party tracking cookies, and we don&apos;t sell your data.</p>

      <h2>Services we rely on</h2>
      <ul>
        <li>
          <strong>Supabase</strong> hosts our database, sign-in and file storage.
        </li>
        <li>
          <strong>AI providers</strong> (such as Groq, Google Gemini, OpenRouter or Anthropic) may process uploaded CV text, as
          described above.
        </li>
        <li>
          <strong>Google</strong>, if you sign in with it.
        </li>
        <li>
          <strong>GitHub</strong>, if you sign in with it or import a project from a repository.
        </li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>Edit or remove anything you&apos;ve posted at any time.</li>
        <li>Change your email, username or password in Settings.</li>
        <li>
          Delete your account in <Link href="/settings">Settings → Account</Link>. This permanently removes your profile, CV,
          projects, comments, likes, follows, messages and uploaded images.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way, we&apos;ll update the date above and let signed-in members know.</p>

      <ContactLine topic="your privacy" />
    </DocPage>
  );
}
