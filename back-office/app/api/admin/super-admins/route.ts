import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// GET - Liste des super admins
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Vérifier que l'utilisateur actuel est super admin
    const { data: currentUserRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!currentUserRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les super admins actifs (user_roles)
    const { data: roles, error } = await serviceClient
      .from('user_roles')
      .select('id, user_id, created_at')
      .eq('is_super_admin', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Récupérer les invitations super admin en attente
    const { data: pendingInvitations } = await serviceClient
      .from('user_invitations')
      .select('id, email, first_name, last_name, created_at, expires_at')
      .eq('is_super_admin', true)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    // Super admins actifs avec email, prénom, nom
    const activeSuperAdmins = await Promise.all(
      (roles || []).map(async (role) => {
        const { data: authUser } = await serviceClient.auth.admin.getUserById(role.user_id);
        const meta = authUser?.user?.user_metadata || {};
        return {
          id: role.id,
          user_id: role.user_id,
          email: authUser?.user?.email || 'Email inconnu',
          first_name: meta.first_name || null,
          last_name: meta.last_name || null,
          created_at: role.created_at,
          status: 'active' as const,
        };
      })
    );

    // Invitations en attente
    const pending = (pendingInvitations || []).map((inv) => ({
      id: inv.id,
      user_id: null,
      email: inv.email,
      first_name: inv.first_name || null,
      last_name: inv.last_name || null,
      created_at: inv.created_at,
      status: 'pending' as const,
      expires_at: inv.expires_at,
    }));

    const superAdmins = [...activeSuperAdmins, ...pending].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ success: true, data: superAdmins });
  } catch (error: any) {
    console.error('GET super-admins error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Inviter un super admin (envoi d'invitation par email, l'utilisateur crée son mot de passe)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Vérifier que l'utilisateur actuel est super admin
    const { data: currentUserRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!currentUserRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { email, first_name, last_name } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe déjà et est super admin
    let page = 1;
    const perPage = 500;
    let existingUser: { id: string } | undefined;
    while (true) {
      const { data } = await serviceClient.auth.admin.listUsers({ page, perPage });
      const users = data?.users || [];
      existingUser = users.find((u) => u.email?.toLowerCase() === normalizedEmail);
      if (existingUser !== undefined || users.length < perPage) break;
      page++;
    }

    if (existingUser) {
      const { data: existingRole } = await serviceClient
        .from('user_roles')
        .select('id, is_super_admin')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingRole?.is_super_admin) {
        return NextResponse.json(
          { error: 'Cet utilisateur est déjà super admin' },
          { status: 400 }
        );
      }
    }

    // Obtenir ou créer l'organisation MARLON Administration
    let orgId: string;
    const { data: orgData } = await serviceClient
      .from('organizations')
      .select('id')
      .eq('name', 'MARLON Administration')
      .limit(1)
      .maybeSingle();

    if (orgData) {
      orgId = orgData.id;
    } else {
      const { data: newOrg, error: orgError } = await serviceClient
        .from('organizations')
        .insert({ name: 'MARLON Administration' })
        .select('id')
        .single();

      if (orgError || !newOrg?.id) {
        return NextResponse.json(
          { error: 'Échec de la création de l\'organisation' },
          { status: 500 }
        );
      }
      orgId = newOrg.id;
    }

    // Vérifier s'il y a déjà une invitation super admin en attente
    const { data: existingInvitation } = await serviceClient
      .from('user_invitations')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('is_super_admin', true)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Une invitation est déjà en attente pour cet email' },
        { status: 400 }
      );
    }

    // Générer le token d'invitation
    const token = crypto.randomUUID();

    // Créer l'enregistrement user_invitations avec is_super_admin
    const { error: inviteDbError } = await serviceClient
      .from('user_invitations')
      .insert({
        organization_id: orgId,
        email: normalizedEmail,
        role: 'admin',
        token,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_super_admin: true,
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
      });

    if (inviteDbError) {
      console.error('Error creating invitation:', inviteDbError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'invitation' },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.marlon.fr';

    // Envoyer l'invitation par email via Supabase Auth
    const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: `${siteUrl}/complete-invitation?token=${token}`,
      data: {
        organization_id: orgId,
        organization_name: 'MARLON Administration',
        invited_role: 'admin',
        invitation_token: token,
        is_super_admin: true,
        first_name: first_name?.trim() || undefined,
        last_name: last_name?.trim() || undefined,
      },
    });

    if (inviteError) {
      // Nettoyer l'invitation en cas d'échec
      await serviceClient
        .from('user_invitations')
        .delete()
        .eq('token', token);

      // Si l'utilisateur existe déjà, l'ajouter directement comme super admin
      if (inviteError.message.includes('already been registered')) {
        let userId = existingUser?.id;
        if (!userId) {
          let p = 1;
          while (true) {
            const { data } = await serviceClient.auth.admin.listUsers({ page: p, perPage: 100 });
            const u = data?.users?.find((x) => x.email?.toLowerCase() === normalizedEmail);
            if (u) {
              userId = u.id;
              break;
            }
            if (!data?.users?.length || data.users.length < 100) break;
            p++;
          }
        }
        if (!userId) {
          return NextResponse.json(
            { error: 'Utilisateur introuvable' },
            { status: 400 }
          );
        }
        const { data: existingRole } = await serviceClient
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingRole) {
          await serviceClient
            .from('user_roles')
            .update({ is_super_admin: true })
            .eq('id', existingRole.id);
        } else {
          await serviceClient.from('user_roles').insert({
            user_id: userId,
            organization_id: orgId,
            role: 'admin',
            status: 'active',
            is_super_admin: true,
          });
          await serviceClient.from('user_permissions').insert({
            user_id: userId,
            organization_id: orgId,
            can_access_orders: true,
            can_create_orders: true,
            can_manage_employees: true,
            can_sign_contracts: true,
          });
        }
        return NextResponse.json({
          success: true,
          message: 'Cet utilisateur existe déjà. Il a été ajouté comme super admin et peut se connecter avec son mot de passe actuel.',
          data: { email: normalizedEmail },
        });
      }

      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation envoyée par email. L\'utilisateur recevra un lien pour créer son mot de passe.',
      data: { email: normalizedEmail },
    });
  } catch (error: any) {
    console.error('POST super-admins error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Retirer un super admin (actif ou invitation en attente)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: currentUserRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!currentUserRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Essayer de retirer un super admin actif (user_roles)
    const { data: role } = await serviceClient
      .from('user_roles')
      .select('id, user_id')
      .eq('id', id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (role) {
      const userId = role.user_id;

      // Ne pas permettre de se supprimer soi-même
      if (userId === user.id) {
        return NextResponse.json(
          { error: 'Vous ne pouvez pas vous supprimer vous-même' },
          { status: 400 }
        );
      }

      // Supprimer les permissions et rôles avant de supprimer l'utilisateur Auth
      await serviceClient.from('user_permissions').delete().eq('user_id', userId);
      await serviceClient.from('user_roles').delete().eq('user_id', userId);

      // Supprimer l'utilisateur de Supabase Auth (disparaît de la liste Users)
      const { error: deleteError } = await serviceClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Error deleting auth user:', deleteError);
        return NextResponse.json(
          { error: deleteError.message || 'Erreur lors de la suppression de l\'utilisateur' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Super admin supprimé' });
    }

    // Essayer de supprimer une invitation en attente
    const { data: invitation } = await serviceClient
      .from('user_invitations')
      .select('id')
      .eq('id', id)
      .eq('is_super_admin', true)
      .is('accepted_at', null)
      .maybeSingle();

    if (invitation) {
      await serviceClient
        .from('user_invitations')
        .delete()
        .eq('id', id);
      return NextResponse.json({ success: true, message: 'Invitation annulée' });
    }

    return NextResponse.json({ error: 'Super admin ou invitation introuvable' }, { status: 404 });
  } catch (error: any) {
    console.error('DELETE super-admins error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
