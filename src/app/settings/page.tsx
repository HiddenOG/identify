import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { AccountSettings } from "./account-settings";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function AccountPage() {
  return (
    <Suspense>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const supabase = await createClient();
  const [{ userId, profile, email }, { data }] = await Promise.all([getCurrentUser(supabase), supabase.auth.getClaims()]);
  if (!userId) redirect("/login?next=/settings");
  if (!profile?.username) redirect("/onboarding");

  // "email" in the sign-in providers means the account already has a password.
  const providers = (data?.claims?.app_metadata as { providers?: string[] } | undefined)?.providers ?? [];

  return (
    <AccountSettings
      email={email}
      username={profile.username}
      name={profile.full_name || profile.username}
      avatarUrl={profile.avatar_url}
      openToWork={profile.open_to_work}
      emailUpdates={profile.email_updates !== false}
      hasPassword={providers.includes("email")}
      joined={profile.created_at}
    />
  );
}
