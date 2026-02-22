import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Route GET /auth/confirm
 * Vérifie le token_hash reçu par email (PKCE / server-side flow).
 * L'email Supabase envoie un lien vers cette route avec token_hash, type et redirect_to.
 * Avantage : tout se passe côté serveur, pas de hash perdu.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const redirectTo = searchParams.get('redirect_to');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.marlon.fr';

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_link`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.redirect(`${baseUrl}/login?error=expired_link`);
  }

  // Invitation → /complete-invitation
  if (type === 'invite') {
    const token = data.user?.user_metadata?.invitation_token || '';
    return NextResponse.redirect(`${baseUrl}/complete-invitation?token=${token}`);
  }

  // Recovery → /reset-password
  if (type === 'recovery') {
    return NextResponse.redirect(`${baseUrl}/reset-password`);
  }

  // Sinon → redirect_to ou catalog
  const destination = redirectTo || `${baseUrl}/catalog`;
  return NextResponse.redirect(destination);
}
