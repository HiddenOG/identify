"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { autoClaim } from "@/lib/discover/actions";

/**
 * Claims the listing as soon as a signed-in member lands here (with the invite's code, or a
 * matching email), so there's nothing left to press. If neither applies, shows `fallback`
 * (the "Request to claim" options).
 */
export function AutoClaim({ portfolioId, token, username, fallback }: { portfolioId: string; token?: string; username: string; fallback: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"claiming" | "claimed" | "manual">("claiming");

  useEffect(() => {
    let live = true;
    autoClaim(portfolioId, token).then(({ claimed }) => {
      if (!live) return;
      setState(claimed ? "claimed" : "manual");
      if (claimed) router.refresh();
    });
    return () => {
      live = false;
    };
  }, [portfolioId, token, router]);

  if (state === "claiming") return <p className="py-6 text-muted">Claiming your portfolio…</p>;
  if (state === "manual") return <>{fallback}</>;
  return (
    <div className="rounded-2xl border border-success bg-success/10 p-6">
      <p className="text-lg font-bold">It&apos;s yours 🎉</p>
      <p className="mt-1 text-muted">The listing now links to your Identify profile. Add your CV and it&apos;s ready to share.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/settings/cv" className="rounded-full bg-foreground px-5 py-2 text-sm text-background hover:opacity-90">
          Fill in your CV
        </Link>
        <Link href={`/${username}`} className="rounded-full border border-foreground px-5 py-2 text-sm hover:bg-surface">
          See your profile
        </Link>
      </div>
    </div>
  );
}
