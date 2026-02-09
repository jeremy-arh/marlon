import { createServiceClient } from '@/lib/supabase/service';

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('user_roles')
    .select('is_super_admin')
    .eq('user_id', userId)
    .eq('is_super_admin', true)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return data.is_super_admin === true;
}
