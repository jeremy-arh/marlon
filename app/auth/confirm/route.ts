import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
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
    const isSuperAdmin = data.user?.user_metadata?.is_super_admin === true;

    if (isSuperAdmin && data.session) {
      const boUrl = process.env.NEXT_PUBLIC_BO_URL || 'https://bo.marlon.fr';
      const params = new URLSearchParams({
        token,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      return NextResponse.redirect(`${boUrl}/complete-invitation?${params.toString()}`);
    }

    return NextResponse.redirect(new URL(`/complete-invitation?token=${token}`, request.url));
  }

  if (type === 'recovery') {
    const boUrl = process.env.NEXT_PUBLIC_BO_URL || 'https://bo.marlon.fr';

    if (data.user && data.session) {
      const serviceClient = createServiceClient();
      const { data: roleData } = await serviceClient
        .from('user_roles')
        .select('is_super_admin')
        .eq('user_id', data.user.id)
        .eq('is_super_admin', true)
        .maybeSingle();

      if (roleData) {
        const params = new URLSearchParams({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        return NextResponse.redirect(`${boUrl}/reset-password?${params.toString()}`);
      }
    }

    return NextResponse.redirect(new URL('/reset-password', request.url));
  }

  if (redirectTo) {
    return NextResponse.redirect(redirectTo);
  }

  return NextResponse.redirect(new URL('/catalog', request.url));
}
