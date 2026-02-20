import { supabase } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/server';

export async function createInvitation(
  email: string,
  organizationId: string,
  invitedBy: string
) {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

  const supabaseClient = await createClient();

  const { data, error } = await supabaseClient
    .from('user_invitations')
    .insert({
      email,
      organization_id: organizationId,
      token,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  // TODO: Send email with invitation link using SendGrid
  const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.marlon.fr'}/accept-invitation/${token}`;

  return { data: { ...data, invitationLink }, error: null };
}

export async function getInvitationByToken(token: string) {
  const supabaseClient = await createClient();

  const { data, error } = await supabaseClient
    .from('user_invitations')
    .select('*, organizations(*)')
    .eq('token', token)
    .single();

  return { data, error };
}
