import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Check all cookies for debugging
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieNames = allCookies.map(c => c.name);
    
    // Try to get user from session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Debug info
    const debugInfo: any = {
      cookieCount: allCookies.length,
      cookieNames: cookieNames,
      hasSupabaseCookies: cookieNames.some(name => name.includes('sb-')),
      authError: authError?.message,
      authErrorCode: authError?.status,
    };
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        debug: debugInfo,
        hint: 'Make sure you are logged in and cookies are being sent',
      });
    }

    // Use service client to bypass RLS
    const serviceClient = createServiceClient();

    // Check user roles
    const { data: userRoles, error: rolesError } = await serviceClient
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id);

    // Check super admin status
    const { data: superAdmin, error: superAdminError } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    // Check if any super admin exists
    const { data: anySuperAdmin, error: anySuperAdminError } = await serviceClient
      .from('user_roles')
      .select('id, user_id, is_super_admin')
      .eq('is_super_admin', true)
      .limit(5);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      userRoles: {
        data: userRoles,
        error: rolesError?.message,
      },
      superAdmin: {
        data: superAdmin,
        error: superAdminError?.message,
        isSuperAdmin: !!superAdmin,
      },
      anySuperAdmin: {
        data: anySuperAdmin,
        error: anySuperAdminError?.message,
        count: anySuperAdmin?.length || 0,
      },
      debug: debugInfo,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
