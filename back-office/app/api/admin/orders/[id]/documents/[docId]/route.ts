import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { createOrderLog } from '@/lib/utils/order-logs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is super admin
    const serviceClient = createServiceClient();
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get document info before deletion
    const { data: document } = await serviceClient
      .from('order_documents')
      .select('name')
      .eq('id', params.docId)
      .eq('order_id', params.id)
      .single();

    const { error } = await serviceClient
      .from('order_documents')
      .delete()
      .eq('id', params.docId)
      .eq('order_id', params.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Create log
    await createOrderLog({
      orderId: params.id,
      actionType: 'document_deleted',
      description: `Document supprimé: ${document?.name || params.docId}`,
      metadata: {
        document_id: params.docId,
        name: document?.name,
      },
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
