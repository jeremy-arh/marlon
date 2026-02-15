import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import EquipmentsClient from './EquipmentsClient';

export const metadata = { title: 'Équipements' };

interface Employee {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
}

export default async function EquipmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organization and role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!userRole) {
    return <EquipmentsClient initialEquipments={[]} initialEmployees={[]} isAdmin={false} />;
  }

  const isAdmin = userRole.role === 'admin';

  // Load employees
  const { data: employeesData } = await supabase
    .rpc('get_organization_users', { org_id: userRole.organization_id });

  const employees: Employee[] = employeesData || [];

  // Get orders with items for this organization
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      leasing_duration_months,
      status,
      order_items(
        id,
        product_id,
        quantity,
        assigned_to_user_id,
        status,
        product:products(
          id,
          name,
          reference,
          product_images(image_url, order_index)
        )
      )
    `)
    .eq('organization_id', userRole.organization_id)
    .not('status', 'in', '(cancelled,completed)');

  if (error) {
    console.error('Error loading equipments:', error);
    return <EquipmentsClient initialEquipments={[]} initialEmployees={employees} isAdmin={isAdmin} />;
  }

  // Transform order items into equipment list
  const equipmentList: any[] = [];

  orders?.forEach((order) => {
    order.order_items?.forEach((item: any) => {
      // For employees: only show equipments assigned to them
      if (!isAdmin && item.assigned_to_user_id !== user.id) {
        return;
      }

      // Use item-level status if set (e.g. maintenance), otherwise derive from order status
      let equipmentStatus = item.status || 'pending';
      if (!item.status || item.status === 'pending') {
        if (order.status === 'delivered') {
          equipmentStatus = 'delivered';
        } else if (order.status === 'shipped') {
          equipmentStatus = 'shipped';
        } else if (['draft', 'pending', 'sent_to_leaser', 'leaser_accepted', 'contract_uploaded', 'processing'].includes(order.status)) {
          equipmentStatus = 'pending';
        }
      }

      // Find assigned employee
      const assignedEmployee = employees.find(
        (emp) => emp.user_id === item.assigned_to_user_id
      );

      equipmentList.push({
        id: item.id,
        order_item_id: item.id,
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        status: equipmentStatus,
        assigned_to_user_id: item.assigned_to_user_id,
        assigned_to: assignedEmployee || null,
        product: item.product,
        order: {
          id: order.id,
          leasing_duration_months: order.leasing_duration_months,
          created_at: order.created_at,
        },
      });
    });
  });

  return (
    <EquipmentsClient
      initialEquipments={equipmentList}
      initialEmployees={employees}
      isAdmin={isAdmin}
    />
  );
}
