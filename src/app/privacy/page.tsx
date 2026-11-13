import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, DocPage } from "@/components/doc-page";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy", description: `How ${SITE_NAME} handles your data.` };

export default function PrivacyPage() {
  return (
    <DocPage
      title="Privacy Policy"
      updated="November 13, 2026"
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

      <h2 id="discover">Discover: if we listed or wrote about you</h2>
      <p>
        Discover features people and projects we think deserve to be seen, including some who aren&apos;t on {SITE_NAME} yet.
        Each one is picked by a person on our team, not collected by a crawler.
      </p>
      <ul>
        <li>
          <strong>How we found you:</strong> on your own public website, or where you shared it publicly, such as a post on X, a
          GitHub profile or a public portfolio directory.
        </li>
        <li>
          <strong>What a listing shows:</strong> your name, role, location, a short description in our own words, a link to your
          site, and a copy of the preview image your site publishes for sharing. We don&apos;t copy your work or your text.
        </li>
        <li>
          <strong>What we keep privately:</strong> a contact email, but only one you publish yourself (on your site or profile).
          It&apos;s never shown on {SITE_NAME}, sold or shared.
        </li>
        <li>
          <strong>Stories (Discover projects):</strong> we sometimes write about a project, with a link back to its creator.
          This is our own commentary; screenshots and images stay credited and linked to their source.
        </li>
        <li>
          <strong>Emails:</strong> we may send you one email to say you&apos;ve been listed or written about, with a link to
          claim your page. We don&apos;t add you to a mailing list.
        </li>
      </ul>
      <p>
        We do this because we have a legitimate interest in showcasing public work, and it&apos;s limited to what you&apos;ve
        already made public. You stay in control:
      </p>
      <ul>
        <li>
          <strong>Claim it:</strong> it becomes your free {SITE_NAME} page, and you can edit or delete it like any profile.
        </li>
        <li>
          <strong>Remove it:</strong> every unclaimed listing, and every invite email, has a &ldquo;Remove your listing&rdquo;
          link. No account needed. It comes down at once, any story about you comes down with it, and we won&apos;t email you
          again.
        </li>
        <li>
          <strong>Ask us anything:</strong> to see what we hold about you, correct it, or take down a single image or sentence,
          contact us using the details at the bottom of this page.
        </li>
      </ul>
      <p>We only read sites whose robots.txt allows it.</p>

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
          <strong>Resend</strong> and <strong>Gmail</strong> deliver our emails (story emails to members, and Discover
          invites).
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
          Turn off story emails in <Link href="/settings#emails">Settings → Story emails</Link>, or with the link in any of them.
        </li>
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
