import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import CustomerDetailClient from './CustomerDetailClient';

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify user is super admin
  const serviceClient = createServiceClient();
  const { data: userRole } = await serviceClient
    .from('user_roles')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .eq('is_super_admin', true)
    .maybeSingle();

  if (!userRole) {
    redirect('/login');
  }

  // Get organization with related data
  const { data: organization, error } = await serviceClient
    .from('organizations')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !organization) {
    notFound();
  }

  // Get employees (user_roles)
  const { data: userRoles } = await serviceClient
    .from('user_roles')
    .select('*')
    .eq('organization_id', params.id);

  // Get user emails, first_name, last_name using admin API
  const userIds = userRoles?.map((ur: any) => ur.user_id).filter(Boolean) || [];
  const userDataMap: Record<string, { email: string; first_name?: string; last_name?: string }> = {};

  if (userIds.length > 0) {
    try {
      const { data: { users }, error: usersError } = await serviceClient.auth.admin.listUsers();
      if (!usersError && users) {
        users.forEach((u: any) => {
          if (u.id && userIds.includes(u.id)) {
            const meta = u.user_metadata || {};
            userDataMap[u.id] = {
              email: u.email || '',
              first_name: meta.first_name || undefined,
              last_name: meta.last_name || undefined,
            };
          }
        });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }

  // Transform user roles to include email and names
  const employees = userRoles?.map((ur: any) => ({
    ...ur,
    user: ur.user_id ? {
      email: userDataMap[ur.user_id]?.email || null,
      first_name: userDataMap[ur.user_id]?.first_name ?? null,
      last_name: userDataMap[ur.user_id]?.last_name ?? null,
    } : null,
  })) || [];

  // Get pending invitations
  const { data: invitations } = await serviceClient
    .from('user_invitations')
    .select('id, email, first_name, last_name, role, token, expires_at, accepted_at, created_at')
    .eq('organization_id', params.id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  // Get orders
  const { data: orders } = await serviceClient
    .from('orders')
    .select(`
      id,
      status,
      total_amount_ht,
      leasing_duration_months,
      created_at,
      updated_at,
      leaser:leasers(
        id,
        name
      )
    `)
    .eq('organization_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <CustomerDetailClient
      organization={organization}
      initialEmployees={employees}
      initialInvitations={invitations || []}
      initialOrders={orders || []}
    />
  );
}
