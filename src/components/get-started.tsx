import { cookies } from "next/headers";
import { GetStartedCard, type Step } from "@/components/get-started-card";
import { GET_STARTED_COOKIE, SHARED_COOKIE } from "@/lib/get-started";
import { getCurrentUser, toFullProfile } from "@/lib/profiles";
import { SITE_URL } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const FOLLOW_GOAL = 3;

/**
 * "Welcome to Identify" for new members: five steps that tick themselves off from real data,
 * plus their CV link to copy or share once the CV has something in it. Gone once everything is
 * done or it's dismissed. Signed-in members only; render inside <Suspense>.
 */
export async function GetStarted() {
  if (!hasSupabaseEnv) return null;
  const jar = await cookies();
  if (jar.get(GET_STARTED_COOKIE)?.value === "hidden") return null;

  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId || !profile?.username) return null;

  const [{ count: projects }, { count: following }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("author_id", userId).eq("status", "published"),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  const { cv } = toFullProfile(profile);
  const cvFilled = Boolean(cv.summary || cv.experience.length || cv.skills.length);
  const shared = jar.get(SHARED_COOKIE)?.value === "1";
  const followed = following ?? 0;

  const steps: Step[] = [
    { id: "photo", label: "Add your photo", hint: "It's cut out automatically, like a portfolio portrait.", href: "/settings/cv#profile", done: Boolean(profile.avatar_url) },
    { id: "cv", label: "Fill in your CV", hint: "Upload a PDF or Word file and let AI fill it in, or type it.", href: "/settings/cv", done: cvFilled },
    { id: "project", label: "Write up your first project", hint: "The problem, how you built it, what happened. Like a README.", href: "/new", done: (projects ?? 0) > 0 },
    {
      id: "follow",
      label: `Follow ${FOLLOW_GOAL} people`,
      hint: followed > 0 && followed < FOLLOW_GOAL ? `${followed} of ${FOLLOW_GOAL} so far.` : "Their new projects show up in your feed.",
      href: "/people",
      done: followed >= FOLLOW_GOAL,
    },
    { id: "share", label: "Share your CV link", hint: "Put it in your bio, your email signature, or your next application.", href: "", done: shared },
  ];
  if (steps.every((s) => s.done)) return null;

  return (
    <GetStartedCard
      firstName={(profile.full_name || profile.username).split(/\s+/)[0]}
      username={profile.username}
      url={`${SITE_URL}/${profile.username}`}
      cvFilled={cvFilled}
      steps={steps}
    />
  );
}
