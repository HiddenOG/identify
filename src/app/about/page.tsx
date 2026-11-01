import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, DocPage } from "@/components/doc-page";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${SITE_NAME} gives you a CV website and a place to show the projects behind it.`,
};

export default function AboutPage() {
  return (
    <DocPage title={`About ${SITE_NAME}`} intro="A CV says what you can do. Your projects show it. We put both at one link.">
      <h2>What it is</h2>
      <p>
        {SITE_NAME} gives everyone a CV website and a place to write up the things they&apos;ve built: the problem, the approach, the
        stack, the result. Each write-up links back to your CV, and your CV shows your projects, so anyone who finds one finds
        the other.
      </p>

      <h2>Who it&apos;s for</h2>
      <p>
        Anyone who builds things. Developers and data scientists, yes, but also designers, engineers, analysts, marketers,
        researchers, procurement and operations people, teachers and makers. If you&apos;ve made something you&apos;re proud of, it
        belongs here. Browse the <Link href="/topics">topics</Link> to see the range.
      </p>

      <h2>How it works</h2>
      <ol>
        <li>
          <strong>Claim your page.</strong> Pick a username; that&apos;s your link.
        </li>
        <li>
          <strong>Fill in your CV.</strong> Type it in, or upload your existing CV and let AI fill in the fields for you to
          check. Choose colors and a font; download it as a PDF any time.
        </li>
        <li>
          <strong>Post your projects.</strong> Write them up like a README, add a cover image, demo and code links, or start
          from a GitHub repo.
        </li>
        <li>
          <strong>Get found.</strong> People can follow you, like and comment on your work, and message you privately.
        </li>
      </ol>

      <h2>For recruiters and hiring teams</h2>
      <p>
        Every profile is a CV with the work to back it up. Search <Link href="/people">People</Link> by skill, location and who&apos;s
        open to work, read how candidates think in their own write-ups, and message them directly.
      </p>

      <h2>Our principles</h2>
      <ul>
        <li>
          <strong>Your work, your page.</strong> You own what you post, and you can delete your account and everything in it from
          Settings.
        </li>
        <li>
          <strong>Proof over polish.</strong> We rank projects by the attention they earn, not by who pays.
        </li>
        <li>
          <strong>Private stays private.</strong> Messages are visible only to the two people in them. See our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </li>
      </ul>

      <ContactLine topic={SITE_NAME} />
    </DocPage>
  );
}
