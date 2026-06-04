import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env["VITE_SUPABASE_URL"];
  const supabaseKey = process.env["VITE_SUPABASE_ANON_KEY"];

  if (!supabaseUrl || !supabaseKey) {
    logger.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    throw new Error("Missing Supabase credentials");
  }

  _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}
