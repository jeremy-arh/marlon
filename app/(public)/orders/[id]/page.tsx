import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import OrderDetailClient from './OrderDetailClient';

export const metadata = { title: 'Détail commande' };

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const orderId = params.id;

  // Load order
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      status,
      total_amount_ht,
      leasing_duration_months,
      delivery_name,
      delivery_address,
      delivery_city,
      delivery_postal_code,
      delivery_country,
      delivery_contact_name,
      delivery_contact_phone,
      organization:organizations(name, siret),
      order_items(
        id,
        quantity,
        purchase_price_ht,
        margin_percent,
        calculated_price_ht,
        product:products(
          id,
          name,
          reference,
          product_images(image_url, order_index)
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    notFound();
  }

  // Load tracking
  const { data: trackingData } = await supabase
    .from('order_tracking')
    .select('financing_status, contract_status, delivery_status')
    .eq('order_id', orderId)
    .single();

  // Load documents
  const { data: documentsData } = await supabase
    .from('order_documents')
    .select('id, name, file_url, file_type, description, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  // Load invoices
  const { data: invoicesData } = await supabase
    .from('order_invoices')
    .select(`
      id,
      invoice:invoices(id, file_url, description, uploaded_at)
    `)
    .eq('order_id', orderId);

  // Load contract
  const { data: contractData } = await supabase
    .from('contracts')
    .select('id, file_url, uploaded_at')
    .eq('order_id', orderId)
    .single();

  return (
    <OrderDetailClient
      order={orderData as any}
      tracking={trackingData}
      documents={documentsData || []}
      invoices={(invoicesData as any) || []}
      contract={contractData}
    />
  );
}
