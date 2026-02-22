import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { token, firstName, lastName } = body;

    const invitationToken = token || user.user_metadata?.invitation_token;
    if (!invitationToken) {
      return NextResponse.json({ error: 'Token d\'invitation requis' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    let inv: {
      id: string;
      organization_id: string;
      role: string;
      email: string;
      is_super_admin?: boolean;
    } | null = null;

    const { data: invitation, error: inviteError } = await serviceClient
      .from('user_invitations')
      .select('id, organization_id, role, email, is_super_admin')
      .eq('token', invitationToken)
      .single();

    if (!inviteError && invitation) {
      inv = invitation;
    } else {
      const { data: emailInvite } = await serviceClient
        .from('user_invitations')
        .select('id, organization_id, role, email, is_super_admin')
        .eq('email', user.email?.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!emailInvite) {
        return NextResponse.json({ error: 'Invitation introuvable ou expirée' }, { status: 404 });
      }
      inv = emailInvite;
    }

    if (inv.email?.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Cette invitation ne correspond pas à votre email' }, { status: 403 });
    }

    const isSuperAdmin = inv.is_super_admin === true || user.user_metadata?.is_super_admin === true;

    const { error: roleError } = await serviceClient
      .from('user_roles')
      .insert({
        user_id: user.id,
        organization_id: inv.organization_id,
        role: inv.role || 'admin',
        status: 'active',
        is_super_admin: isSuperAdmin,
      });

    if (roleError) {
      if (roleError.message.includes('duplicate') || roleError.code === '23505') {
        await serviceClient
          .from('user_roles')
          .update({ is_super_admin: isSuperAdmin })
          .eq('user_id', user.id)
          .eq('organization_id', inv.organization_id);
      } else {
        console.error('Error creating role:', roleError);
        return NextResponse.json({ error: roleError.message }, { status: 500 });
      }
    }

    const isAdmin = inv.role === 'admin' || isSuperAdmin;
    await serviceClient
      .from('user_permissions')
      .upsert(
        {
          user_id: user.id,
          organization_id: inv.organization_id,
          can_access_orders: isAdmin,
          can_create_orders: isAdmin,
          can_manage_employees: isAdmin,
          can_sign_contracts: isAdmin,
        },
        { onConflict: 'user_id,organization_id' }
      );

    await serviceClient
      .from('user_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', inv.id);

    return NextResponse.json({ success: true, is_super_admin: isSuperAdmin });
  } catch (error: any) {
    console.error('complete-invitation error:', error);
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
