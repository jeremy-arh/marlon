import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { createOrderLog } from '@/lib/utils/order-logs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('order_invoices')
      .select(`
        *,
        invoice:invoices(*)
      `)
      .eq('order_id', params.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json();
    const { invoice_id } = body;

    if (!invoice_id) {
      return NextResponse.json(
        { error: 'L\'ID de la facture est requis' },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from('order_invoices')
      .insert({
        order_id: params.id,
        invoice_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get invoice info for log
    const { data: invoice } = await serviceClient
      .from('invoices')
      .select('description')
      .eq('id', invoice_id)
      .single();

    // Create log
    await createOrderLog({
      orderId: params.id,
      actionType: 'invoice_added',
      description: `Facture ajoutée: ${invoice?.description || invoice_id}`,
      metadata: {
        invoice_id,
        description: invoice?.description,
      },
      userId: user.id,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
