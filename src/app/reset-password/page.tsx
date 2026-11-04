import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { NewPasswordForm } from "@/app/login/password-forms";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

/** Reached from the reset email (via /auth/confirm or /auth/callback), which has signed them in. */
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 font-serif text-3xl font-bold">Choose a new password</h1>
      {hasSupabaseEnv && (
        <Suspense>
          <ResetPassword />
        </Suspense>
      )}
    </main>
  );
}

async function ResetPassword() {
  const { data } = await (await createClient()).auth.getClaims();
  if (!data?.claims) {
    return (
      <p className="mt-6 text-muted">
        This reset link has expired or was already used.{" "}
        <Link href="/login/forgot" className="text-foreground underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }
  return (
    <>
      <p className="mb-8 text-muted">At least 8 characters.</p>
      <NewPasswordForm />
    </>
  );
}
