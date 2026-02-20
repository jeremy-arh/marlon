import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Clear all cookies
  const cookieStore = await cookies();
  cookieStore.delete('sb-access-token');
  cookieStore.delete('sb-refresh-token');
  
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'https://app.marlon.fr'));
}
