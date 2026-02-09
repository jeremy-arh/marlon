import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

/**
 * This endpoint should only be accessible once to create the first super admin
 * In production, protect this with additional security measures or use a one-time setup script
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, organizationName } = body;

    // Use service role client to bypass RLS for setup
    const supabase = createServiceClient();

    // Check if any super admin already exists
    // Use maybeSingle to handle cases where column might not exist or no data
    const { data: existingSuperAdmin, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('is_super_admin', true)
      .limit(1)
      .maybeSingle();

    // If error is about column not existing, continue (migration not applied yet)
    if (checkError && !checkError.message.includes('column') && !checkError.message.includes('does not exist')) {
      return NextResponse.json(
        { error: `Error checking super admin: ${checkError.message}` },
        { status: 500 }
      );
    }

    if (existingSuperAdmin) {
      return NextResponse.json(
        { error: 'A super admin already exists. Please use the regular registration flow.' },
        { status: 400 }
      );
    }

    // Create user using service role client to bypass email confirmation
    // This ensures the user is immediately available in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email so user is immediately available
      user_metadata: {
        is_setup_user: true,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 400 }
      );
    }

    if (!authData || !authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user: No user data returned' },
        { status: 400 }
      );
    }

    // Verify user exists and get user ID
    const userId = authData.user.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to create user: Invalid user ID' },
        { status: 400 }
      );
    }

    // Wait a moment to ensure user is fully created in database
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create organization
    let organizationId = null;
    const orgNameToUse = organizationName || 'MARLON Administration';
    
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgNameToUse,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json(
        { 
          error: `Failed to create organization: ${orgError.message}`,
          details: orgError
        },
        { status: 500 }
      );
    }

    if (!orgData || !orgData.id) {
      return NextResponse.json(
        { error: 'Failed to create organization: No data returned' },
        { status: 500 }
      );
    }

    organizationId = orgData.id;

    // Try to insert with is_super_admin, if column doesn't exist, insert without it first
    let roleError = null;

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role: 'admin',
        status: 'active',
        is_super_admin: true,
      });

    roleError = insertError;

    // If error is about column not existing, try without it and update later
    if (insertError && (insertError.message.includes('column') || insertError.message.includes('does not exist'))) {
      // Insert without is_super_admin first
      const { error: insertError2 } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          role: 'admin',
          status: 'active',
        });

      if (insertError2) {
        roleError = insertError2;
      } else {
        // Update to set is_super_admin (if column exists)
        await supabase
          .from('user_roles')
          .update({ is_super_admin: true })
          .eq('user_id', userId)
          .eq('organization_id', organizationId);
        
        roleError = null;
      }
    }

    // If error is about foreign key constraint, the user might not exist in auth.users yet
    if (insertError && insertError.message.includes('foreign key')) {
      console.error('Foreign key error - user might not exist:', insertError);
      return NextResponse.json(
        { 
          error: `Failed to create user role: ${insertError.message}. The user may need email confirmation.`,
          details: 'Try checking your email or disabling email confirmation in Supabase settings for development.',
          userId: userId
        },
        { status: 400 }
      );
    }

    if (roleError) {
      console.error('Error creating user role:', roleError);
      return NextResponse.json(
        { 
          error: `Failed to create user role: ${roleError.message}`,
          details: roleError
        },
        { status: 400 }
      );
    }

    // Create permissions for super admin
    const { error: permError } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        can_access_orders: true,
        can_create_orders: true,
        can_manage_employees: true,
        can_sign_contracts: true,
      });

    if (permError) {
      console.error('Error creating permissions:', permError);
      // Don't fail the whole operation if permissions fail, but log it
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully',
      user: {
        id: userId,
        email: authData.user.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
