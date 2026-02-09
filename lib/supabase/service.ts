import { createClient } from '@supabase/supabase-js';

/**
 * Service role client that bypasses RLS
 * Use this ONLY in API routes for admin operations
 * Never expose the service role key to the client
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
