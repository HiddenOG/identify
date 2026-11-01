import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./env";

/**
 * Cookie-free client for public reads. Safe inside "use cache" because it never
 * touches the request, and RLS limits it to what anonymous visitors may see.
 */
export function createPublicClient() {
  return createSupabaseClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}
