import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

/**
 * Temporary endpoint to fix super admin status
 * Remove this after fixing the issue
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const regularSupabase = await createClient();
    
    const { data: { user } } = await regularSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'No user role found' }, { status: 404 });
    }

    // Try to update is_super_admin
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ is_super_admin: true })
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({
        error: updateError.message,
        details: updateError,
        userRole,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin status updated',
      userRole: {
        ...userRole,
        is_super_admin: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
