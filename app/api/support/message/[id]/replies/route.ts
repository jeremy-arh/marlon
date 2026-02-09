import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// GET - Get all replies for a support message (user's own tickets)
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

    // Verify the ticket belongs to the user
    const { data: supportMessage, error: msgError } = await serviceClient
      .from('support_messages')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (msgError || !supportMessage) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    if (supportMessage.user_id !== user.id) {
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

// POST - Create a reply to a support message (user's own tickets)
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

    // Verify the ticket belongs to the user
    const { data: supportMessage, error: msgError } = await serviceClient
      .from('support_messages')
      .select('id, user_id, status')
      .eq('id', id)
      .single();

    if (msgError || !supportMessage) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 });
    }

    if (supportMessage.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Le message est requis' }, { status: 400 });
    }

    // Create the reply
    console.log('Creating reply:', { support_message_id: id, user_id: user.id, message: message.trim() });
    const { data: reply, error } = await serviceClient
      .from('support_message_replies')
      .insert({
        support_message_id: id,
        user_id: user.id,
        message: message.trim(),
        is_admin_reply: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reply:', error);
      throw error;
    }
    console.log('Reply created successfully:', reply);

    // Update support message status back to pending if it was resolved/closed
    if (supportMessage.status === 'resolved' || supportMessage.status === 'closed') {
      await serviceClient
        .from('support_messages')
        .update({ 
          status: 'pending',
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
