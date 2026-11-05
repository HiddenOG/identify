"use server";

import { isAdmin } from "@/lib/discover/portfolios";
import { searchAbout, type AboutChoice } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";

/** The editor's "About" search (admins only). */
export async function searchAboutAction(query: string): Promise<AboutChoice[]> {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) return [];
  return searchAbout(supabase, query.slice(0, 80));
}
