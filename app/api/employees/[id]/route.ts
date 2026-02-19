import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

async function verifyAdminAccess(targetUserId: string) {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user) {
    return { error: 'Non authentifié', status: 401, user: null, organizationId: null };
  }

  const supabase = createServiceClient();

  const { data: currentUserRole } = await supabase
    .from('user_roles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!currentUserRole || currentUserRole.role !== 'admin') {
    return { error: 'Accès refusé', status: 403, user: null, organizationId: null };
  }

  const { data: targetUserRole } = await supabase
    .from('user_roles')
    .select('organization_id')
    .eq('user_id', targetUserId)
    .eq('organization_id', currentUserRole.organization_id)
    .single();

  if (!targetUserRole) {
    return { error: 'Utilisateur introuvable dans cette organisation', status: 404, user: null, organizationId: null };
  }

  if (user.id === targetUserId) {
    return { error: 'Vous ne pouvez pas modifier votre propre compte', status: 400, user: null, organizationId: null };
  }

  return { error: null, status: 200, user, organizationId: currentUserRole.organization_id };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: targetUserId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const access = await verifyAdminAccess(targetUserId);
    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('user_roles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', targetUserId)
      .eq('organization_id', access.organizationId);

    if (error) {
      console.error('Error updating user status:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du statut' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: targetUserId } = await params;

    const access = await verifyAdminAccess(targetUserId);
    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = createServiceClient();

    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', targetUserId)
      .eq('organization_id', access.organizationId);

    if (roleError) {
      console.error('Error deleting user role:', roleError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du rôle' },
        { status: 500 }
      );
    }

    const { data: otherRoles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', targetUserId);

    if (!otherRoles || otherRoles.length === 0) {
      const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId);
      if (authError) {
        console.error('Error deleting auth user:', authError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
