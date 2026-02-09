import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch logs
    const { data: logs, error } = await serviceClient
      .from('organization_logs')
      .select('*')
      .eq('organization_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get unique user IDs
    const userIds = Array.from(new Set(logs?.filter((log: any) => log.user_id).map((log: any) => log.user_id) || []));
    
    // Fetch user emails using admin API
    const userEmailsMap: Record<string, string> = {};
    if (userIds.length > 0) {
      try {
        const { data: { users }, error: usersError } = await serviceClient.auth.admin.listUsers();
        if (!usersError && users) {
          users.forEach((u: any) => {
            if (u.id && userIds.includes(u.id)) {
              userEmailsMap[u.id] = u.email || '';
            }
          });
        }
      } catch (err) {
        console.error('Error fetching user emails:', err);
        // Continue without emails if there's an error
      }
    }

    // Transform logs with user emails
    const transformedLogs = logs?.map((log: any) => ({
      ...log,
      user: log.user_id ? { email: userEmailsMap[log.user_id] || null } : null,
    })) || [];

    return NextResponse.json({ success: true, data: transformedLogs });
  } catch (error: any) {
    console.error('Error fetching organization logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
