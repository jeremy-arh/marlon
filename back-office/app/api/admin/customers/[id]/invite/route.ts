import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const organizationId = params.id;
    const body = await request.json();
    const { email, role, first_name, last_name } = body;

    if (!email || !organizationId) {
      return NextResponse.json(
        { error: 'Email et organisation requis' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    // Vérifier que l'organisation existe
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organisation introuvable' },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: { users: existingUsers } } = await serviceClient.auth.admin.listUsers();
    const existingUser = existingUsers?.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      const { data: existingRole } = await serviceClient
        .from('user_roles')
        .select('id, status')
        .eq('user_id', existingUser.id)
        .eq('organization_id', organizationId)
        .single();

      if (existingRole) {
        if (existingRole.status === 'active') {
          return NextResponse.json(
            { error: 'Cet utilisateur fait déjà partie de cette organisation' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: "Cet utilisateur a déjà un compte dans cette organisation (inactif)" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Cet email est déjà associé à un compte. L'utilisateur doit se connecter et demander à rejoindre l'organisation." },
        { status: 400 }
      );
    }

    // Vérifier invitation en attente
    const { data: existingInvitation } = await serviceClient
      .from('user_invitations')
      .select('id, created_at')
      .eq('organization_id', organizationId)
      .eq('email', normalizedEmail)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Une invitation est déjà en attente pour cet email' },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();

    const { error: inviteDbError } = await serviceClient
      .from('user_invitations')
      .insert({
        organization_id: organizationId,
        email: normalizedEmail,
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
        role: role || 'employee',
        token,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (inviteDbError) {
      console.error('Error creating invitation:', inviteDbError);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'invitation" },
        { status: 500 }
      );
    }

    // URL de l'app principale pour la redirection après acceptation (page complete-invitation)
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: `${siteUrl}/complete-invitation?token=${token}`,
      data: {
        organization_id: organizationId,
        organization_name: org.name || 'Votre organisation',
        invited_role: role || 'employee',
        invitation_token: token,
        first_name: first_name?.trim() || undefined,
        last_name: last_name?.trim() || undefined,
      },
    });

    if (error) {
      await serviceClient
        .from('user_invitations')
        .delete()
        .eq('token', token);

      console.error('Error inviting user:', error);
      if (error.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Cet email est déjà enregistré' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation envoyée par email',
      user: data.user,
    });
  } catch (error: any) {
    console.error('Error in invite API:', error);
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
