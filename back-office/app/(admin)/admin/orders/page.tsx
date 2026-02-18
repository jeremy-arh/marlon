import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
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

  // Get orders with related data using service client to bypass RLS
  // Try a simpler query first to debug
  const { data: ordersData, error: ordersError } = await serviceClient
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    return <OrdersClient initialOrders={[]} />;
  }

  if (!ordersData || ordersData.length === 0) {
    return <OrdersClient initialOrders={[]} />;
  }

  // Now fetch related data for each order
  const ordersWithRelations = await Promise.all(
    ordersData.map(async (order: any) => {
      // Fetch organization
      const { data: org } = await serviceClient
        .from('organizations')
        .select('name')
        .eq('id', order.organization_id)
        .single();

      // Fetch leaser if exists
      let leaser = null;
      if (order.leaser_id) {
        const { data: leaserData } = await serviceClient
          .from('leasers')
          .select('name')
          .eq('id', order.leaser_id)
          .single();
        leaser = leaserData;
      }

      // Fetch order items with products
      const { data: items } = await serviceClient
        .from('order_items')
        .select(`
          *,
          product:products(name, purchase_price_ht, marlon_margin_percent)
        `)
        .eq('order_id', order.id);

      // Fetch tracking
      const { data: tracking } = await serviceClient
        .from('order_tracking')
        .select('contract_start_date')
        .eq('order_id', order.id)
        .maybeSingle();

      return {
        ...order,
        organization: org || null,
        leaser: leaser || null,
        order_items: items || [],
        order_tracking: tracking ? [tracking] : []
      };
    })
  );

  // Debug: log orders count
  console.log('Orders fetched:', ordersWithRelations?.length || 0);

  return <OrdersClient initialOrders={ordersWithRelations || []} />;
}
