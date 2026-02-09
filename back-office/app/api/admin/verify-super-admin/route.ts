import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ isSuperAdmin: false, error: 'Not authenticated' });
    }

    // Use service client to bypass RLS
    const serviceClient = createServiceClient();
    const { data: userRole, error } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        isSuperAdmin: false,
        error: error.message,
        userId: user.id,
      });
    }

    return NextResponse.json({
      isSuperAdmin: !!userRole,
      userId: user.id,
      userRole,
    });
  } catch (error: any) {
    return NextResponse.json({
      isSuperAdmin: false,
      error: error.message,
    });
  }
}
