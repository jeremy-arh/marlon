import { createClient } from '@/lib/supabase/server';

export async function hasPermission(
  userId: string,
  organizationId: string,
  permission: 'can_access_orders' | 'can_create_orders' | 'can_manage_employees' | 'can_sign_contracts'
): Promise<boolean> {
  const supabase = await createClient();

  // Check if user is admin (admins have all permissions)
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  if (roleData?.role === 'admin') {
    return true;
  }

  // Check specific permission
  const { data: permissionData } = await supabase
    .from('user_permissions')
    .select(permission)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  return permissionData?.[permission] || false;
}

export async function getUserPermissions(userId: string, organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  return { data, error };
}

export async function updatePermissions(
  userId: string,
  organizationId: string,
  permissions: {
    can_access_orders?: boolean;
    can_create_orders?: boolean;
    can_manage_employees?: boolean;
    can_sign_contracts?: boolean;
  }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_permissions')
    .upsert({
      user_id: userId,
      organization_id: organizationId,
      ...permissions,
    })
    .select()
    .single();

  return { data, error };
}
