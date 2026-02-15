import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OrdersClient from './OrdersClient';

export const metadata = { title: 'Commandes' };

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organization
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!userRole) {
    return <OrdersClient initialOrders={[]} />;
  }

  // Load orders with items and products
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      status,
      total_amount_ht,
      leasing_duration_months,
      order_items(
        id,
        quantity,
        purchase_price_ht,
        margin_percent,
        product:products(
          id,
          name
        )
      )
    `)
    .eq('organization_id', userRole.organization_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading orders:', error);
    return <OrdersClient initialOrders={[]} />;
  }

  return <OrdersClient initialOrders={orders || []} />;
}
