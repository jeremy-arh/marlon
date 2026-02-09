import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import OrderDetailClient from './OrderDetailClient';

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
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
    redirect('/login');
  }

  // Get order with all related data
  const { data: order, error } = await serviceClient
    .from('orders')
    .select(`
      *,
      organization:organizations(
        id,
        name,
        siret,
        email,
        phone,
        address,
        city,
        postal_code,
        country
      ),
      leaser:leasers(
        id,
        name,
        contact_email,
        contact_phone
      ),
      order_items(
        *,
        product:products(
          id,
          name,
          reference,
          purchase_price_ht,
          marlon_margin_percent,
          product_images(
            image_url,
            order_index
          )
        )
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !order) {
    notFound();
  }

  // Get tracking data
  const { data: tracking } = await serviceClient
    .from('order_tracking')
    .select('*')
    .eq('order_id', params.id)
    .single();

  // Get documents
  const { data: documents } = await serviceClient
    .from('order_documents')
    .select('*')
    .eq('order_id', params.id)
    .order('created_at', { ascending: false });

  // Get invoices
  const { data: orderInvoices } = await serviceClient
    .from('order_invoices')
    .select(`
      *,
      invoice:invoices(*)
    `)
    .eq('order_id', params.id);

  const invoices = orderInvoices?.map((oi: any) => ({
    ...oi,
    invoice: oi.invoice,
  })) || [];

  return (
    <OrderDetailClient
      order={order}
      initialTracking={tracking || undefined}
      initialDocuments={documents || []}
      initialInvoices={invoices}
    />
  );
}
