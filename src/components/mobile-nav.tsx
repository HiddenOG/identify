import { MobileTabBar } from "@/components/mobile-tab-bar";
import { getCurrentUser } from "@/lib/profiles";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** The phone tab bar, for signed-in people who have finished onboarding. Render inside <Suspense>. */
export async function MobileNav() {
  if (!hasSupabaseEnv) return null;
  const { profile } = await getCurrentUser(await createClient());
  if (!profile?.username) return null;
  return <MobileTabBar username={profile.username} name={profile.full_name || profile.username} avatarUrl={profile.avatar_url} />;
}
