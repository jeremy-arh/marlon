import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, organizationId, organizationName, invitedBy } = body;

    // Validate required fields
    if (!email || !organizationId) {
      return NextResponse.json(
        { error: 'Email et organization requis' },
        { status: 400 }
      );
    }

    // Validate email format
    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if user already exists in auth
    const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.find(u => u.email?.toLowerCase() === normalizedEmail);
    
    if (existingUser) {
      // Check if user already has a role in this organization
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id, status')
        .eq('user_id', existingUser.id)
        .eq('organization_id', organizationId)
        .single();

      if (existingRole) {
        if (existingRole.status === 'active') {
          return NextResponse.json(
            { error: 'Cet utilisateur fait déjà partie de votre organisation' },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { error: 'Cet utilisateur a déjà un compte dans votre organisation (inactif)' },
            { status: 400 }
          );
        }
      }

      // User exists but not in this organization - we could add them directly
      // For now, return an error asking to use a different flow
      return NextResponse.json(
        { error: 'Cet email est déjà associé à un compte. L\'utilisateur doit se connecter et demander à rejoindre votre organisation.' },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation for this email in this organization
    const { data: existingInvitation } = await supabase
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

    // Generate invitation token
    const token = crypto.randomUUID();
    
    // Store invitation in database first
    const { error: inviteDbError } = await supabase
      .from('user_invitations')
      .insert({
        organization_id: organizationId,
        email: normalizedEmail,
        role: role || 'employee',
        token: token,
        invited_by: invitedBy,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (inviteDbError) {
      console.error('Error creating invitation record:', inviteDbError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'invitation' },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.marlon.fr';

    // Invite user via Supabase Auth - this sends the email automatically
    // redirectTo doit être dans la liste "Redirect URLs" du dashboard Supabase (Auth > URL Configuration)
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: `${siteUrl}/complete-invitation?token=${token}`,
      data: {
        organization_id: organizationId,
        organization_name: organizationName,
        invited_role: role || 'user',
        invitation_token: token,
      },
    });

    console.log('Invitation sent. User should receive email with link to:', `${siteUrl}/complete-invitation`);

    if (error) {
      // Clean up the invitation record if Supabase invite fails
      await supabase
        .from('user_invitations')
        .delete()
        .eq('token', token);

      console.error('Error inviting user:', error);
      
      // Check for specific errors
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
      user: data.user 
    });
  } catch (error: any) {
    console.error('Error in invite API:', error);
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
