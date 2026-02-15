import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ user: null, role: null });
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return NextResponse.json({ 
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        }, 
        role: null 
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
      role: roleData?.role || null,
    });
  } catch (error: any) {
    console.error('Error in /api/user/role:', error);
    return NextResponse.json(
      { user: null, role: null },
      { status: 500 }
    );
  }
}
