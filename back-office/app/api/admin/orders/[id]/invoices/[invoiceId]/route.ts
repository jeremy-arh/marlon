import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { createOrderLog } from '@/lib/utils/order-logs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; invoiceId: string } }
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

    // Get invoice info before deletion
    const { data: invoice } = await serviceClient
      .from('invoices')
      .select('description')
      .eq('id', params.invoiceId)
      .single();

    const { error } = await serviceClient
      .from('order_invoices')
      .delete()
      .eq('invoice_id', params.invoiceId)
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
      actionType: 'invoice_removed',
      description: `Facture retirée: ${invoice?.description || params.invoiceId}`,
      metadata: {
        invoice_id: params.invoiceId,
        description: invoice?.description,
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
