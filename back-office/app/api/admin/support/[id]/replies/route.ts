import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// GET - Get all replies for a support message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verify super admin
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { data: replies, error } = await serviceClient
      .from('support_message_replies')
      .select('*')
      .eq('support_message_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get user info for each reply
    const formattedReplies = await Promise.all(
      (replies || []).map(async (reply: any) => {
        const { data: userData } = await serviceClient.auth.admin.getUserById(reply.user_id);
        return {
          ...reply,
          user_email: userData?.user?.email,
          user_name: `${userData?.user?.user_metadata?.first_name || ''} ${userData?.user?.user_metadata?.last_name || ''}`.trim() || userData?.user?.email,
        };
      })
    );

    return NextResponse.json({ success: true, data: formattedReplies });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a reply to a support message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verify super admin
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Le message est requis' }, { status: 400 });
    }

    // Verify the support message exists
    const { data: supportMessage, error: msgError } = await serviceClient
      .from('support_messages')
      .select('id, status')
      .eq('id', id)
      .single();

    if (msgError || !supportMessage) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    // Create the reply
    console.log('Creating reply:', { support_message_id: id, user_id: user.id, message: message.trim() });
    const { data: reply, error } = await serviceClient
      .from('support_message_replies')
      .insert({
        support_message_id: id,
        user_id: user.id,
        message: message.trim(),
        is_admin_reply: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
    console.log('Reply created successfully:', reply);

    // Update support message status to in_progress if it was pending
    if (supportMessage.status === 'pending') {
      await serviceClient
        .from('support_messages')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    }

    // Get user info for the reply
    const { data: userData } = await serviceClient.auth.admin.getUserById(user.id);
    const formattedReply = {
      ...reply,
      user_email: userData?.user?.email,
      user_name: `${userData?.user?.user_metadata?.first_name || ''} ${userData?.user?.user_metadata?.last_name || ''}`.trim() || userData?.user?.email,
    };

    return NextResponse.json({ success: true, data: formattedReply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
