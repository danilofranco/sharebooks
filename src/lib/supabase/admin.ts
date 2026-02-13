import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Client com service_role — usar SOMENTE em server-side (Route Handlers, Server Actions).
 * Bypassa RLS.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
