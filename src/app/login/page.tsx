import { Suspense } from "react";
import type { Metadata } from "next";
import { SetupNotice } from "@/components/setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <Suspense>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginContent({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const mode = params.mode === "signup" ? "signup" : "signin";
  const next = typeof params.next === "string" ? params.next : "/";
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <>
      <h1 className="mb-2 font-serif text-3xl font-bold">{mode === "signup" ? "Join the builders" : "Welcome back"}</h1>
      <p className="mb-8 text-muted">
        {mode === "signup" ? "Post your projects and get a CV page people can find." : "Sign in to your account."}
      </p>
      {hasSupabaseEnv ? <AuthForm key={mode} mode={mode} next={next} initialError={error} /> : <SetupNotice />}
    </>
  );
}
