import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// GET all support messages
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verify super admin
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = serviceClient
      .from('support_messages')
      .select(`
        *,
        organization:organizations(name)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get user info for each message
    const messagesWithUsers = await Promise.all(
      (data || []).map(async (message) => {
        if (message.user_id) {
          const { data: userData } = await serviceClient.auth.admin.getUserById(message.user_id);
          return {
            ...message,
            user_email: userData?.user?.email,
            user_name: `${userData?.user?.user_metadata?.first_name || ''} ${userData?.user?.user_metadata?.last_name || ''}`.trim() || userData?.user?.email,
          };
        }
        return message;
      })
    );

    return NextResponse.json({ success: true, data: messagesWithUsers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update a support message
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verify super admin
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, priority, admin_notes, assigned_to } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await serviceClient
      .from('support_messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
