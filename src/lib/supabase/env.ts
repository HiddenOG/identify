export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False until .env.local is filled in; lets pages render a setup notice instead of crashing. */
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey);
