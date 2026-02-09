import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    // Use service role to bypass RLS for checking
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('is_super_admin', true)
      .limit(1)
      .maybeSingle();

    // If error is about column not existing, return false (no super admin exists yet)
    if (error) {
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        return NextResponse.json({
          exists: false,
          note: 'Migration not applied yet - column is_super_admin does not exist',
        });
      }
      return NextResponse.json(
        { exists: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: !!data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { exists: false, error: error.message },
      { status: 500 }
    );
  }
}
