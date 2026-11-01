import { Suspense } from "react";
import Link from "next/link";
import { isSignedInMember } from "@/lib/profiles";
import { FOOTER_LINKS } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Footer links for visitors; signed-in people have the sidebar and header instead. */
export function SiteFooter() {
  return (
    <Suspense>
      <VisitorFooter />
    </Suspense>
  );
}

async function VisitorFooter() {
  if (hasSupabaseEnv && (await isSignedInMember(await createClient()))) return null;

  return (
    <footer className="border-t border-line print:hidden">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-6 text-sm text-muted">
        {FOOTER_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
