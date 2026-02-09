import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EmployeesClient from './EmployeesClient';

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organization and role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!userRole) {
    return (
      <EmployeesClient
        initialEmployees={[]}
        initialInvitations={[]}
        organizationId=""
        currentUserId={user.id}
        isAdmin={false}
      />
    );
  }

  const isAdmin = userRole.role === 'admin';

  // Get all employees in the organization using RPC function
  const { data: employeesData, error: employeesError } = await supabase
    .rpc('get_organization_users', { org_id: userRole.organization_id });

  if (employeesError) {
    console.error('Error loading employees:', employeesError);
  }

  // Get pending invitations (not accepted and not expired)
  const { data: invitationsData } = await supabase
    .from('user_invitations')
    .select('id, email, role, token, expires_at, accepted_at, created_at')
    .eq('organization_id', userRole.organization_id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return (
    <EmployeesClient
      initialEmployees={employeesData || []}
      initialInvitations={invitationsData || []}
      organizationId={userRole.organization_id}
      currentUserId={user.id}
      isAdmin={isAdmin}
    />
  );
}
