import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const redirectTo = searchParams.get('redirect_to');

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL('/login?error=invalid_link', request.url));
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.redirect(new URL('/login?error=expired_link', request.url));
  }

  if (type === 'invite') {
    const token = data.user?.user_metadata?.invitation_token || '';
    return NextResponse.redirect(new URL(`/complete-invitation?token=${token}`, request.url));
  }

  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', request.url));
  }

  if (redirectTo) {
    return NextResponse.redirect(redirectTo);
  }

  return NextResponse.redirect(new URL('/catalog', request.url));
}
