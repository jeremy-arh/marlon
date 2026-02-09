import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

// POST - Create a new support message
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Vous devez être connecté pour envoyer un message' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, message, priority } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: 'Le sujet et le message sont requis' }, { status: 400 });
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    const ticketPriority = validPriorities.includes(priority) ? priority : 'normal';

    // Get user's organization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from('support_messages')
      .insert({
        user_id: user.id,
        organization_id: userRole?.organization_id || null,
        subject,
        message,
        status: 'pending',
        priority: ticketPriority,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating support message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get user's support messages
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching support messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
