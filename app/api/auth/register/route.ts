import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendSignupNotificationToAdmins } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, organizationName, firstName, lastName, phone, profession } = body;

    // Validation des champs obligatoires
    if (!firstName?.trim()) {
      return NextResponse.json({ error: 'Le prénom est requis' }, { status: 400 });
    }
    if (!lastName?.trim()) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "L'email est requis" }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Le téléphone est requis' }, { status: 400 });
    }
    if (!profession?.trim()) {
      return NextResponse.json({ error: 'La spécialité est requise' }, { status: 400 });
    }
    if (!organizationName?.trim()) {
      return NextResponse.json({ error: "Le nom de l'organisation est requis" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    // Use service client to bypass RLS for registration
    const supabase = createServiceClient();

    // Create user with metadata
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        first_name: firstName || '',
        last_name: lastName || '',
        phone: phone || '',
        profession: profession || '',
      },
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    // Create organization with contact info
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        email: email.trim(),
        phone: phone.trim(),
        contact_first_name: firstName.trim(),
        contact_last_name: lastName.trim(),
        contact_specialty_id: profession.trim() || null,
      })
      .select()
      .single();

    if (orgError || !orgData) {
      // If org creation fails, we should clean up the user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: orgError?.message || 'Failed to create organization' },
        { status: 400 }
      );
    }

    // Create user role as admin
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        organization_id: orgData.id,
        role: 'admin',
        status: 'active',
      });

    if (roleError) {
      // Clean up on failure
      await supabase.from('organizations').delete().eq('id', orgData.id);
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: roleError.message },
        { status: 400 }
      );
    }

    // Create default permissions for admin
    await supabase
      .from('user_permissions')
      .insert({
        user_id: authData.user.id,
        organization_id: orgData.id,
        can_access_orders: true,
        can_create_orders: true,
        can_manage_employees: true,
        can_sign_contracts: true,
      });

    // Notification aux admins (non bloquant)
    sendSignupNotificationToAdmins({
      email: email.trim(),
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
      organizationName: organizationName?.trim(),
      organizationId: orgData.id,
      source: 'register',
    }).catch(() => {});

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
