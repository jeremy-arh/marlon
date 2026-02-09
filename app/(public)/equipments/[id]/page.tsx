import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import EquipmentDetailClient from './EquipmentDetailClient';

export default async function EquipmentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const equipmentId = params.id;

  // Get user role
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!userRole) {
    redirect('/login');
  }

  const isAdmin = userRole.role === 'admin';

  // Get basic order_item info
  const { data: orderItem, error: itemError } = await supabase
    .from('order_items')
    .select('id, order_id, quantity, assigned_to_user_id, product_id')
    .eq('id', equipmentId)
    .maybeSingle();

  if (itemError || !orderItem) {
    notFound();
  }

  // Get order info
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('id, status, leasing_duration_months, created_at, organization_id')
    .eq('id', orderItem.order_id)
    .maybeSingle();

  if (orderError || !orderData) {
    notFound();
  }

  // Check access: user must belong to the organization
  if (orderData.organization_id !== userRole.organization_id) {
    notFound();
  }

  // If employee, check if assigned to this equipment
  if (userRole.role === 'employee' && orderItem.assigned_to_user_id !== user.id) {
    notFound();
  }

  // Get product info
  const { data: productData, error: productError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      reference,
      description,
      brand:brands(name),
      product_categories(category:categories(id, name)),
      product_images(image_url, order_index)
    `)
    .eq('id', orderItem.product_id)
    .maybeSingle();

  if (productError || !productData) {
    notFound();
  }

  // Fetch product documents
  const { data: documents } = await supabase
    .from('product_documents')
    .select('id, name, description, file_url, file_type, file_size')
    .eq('product_id', productData.id);

  const product = {
    ...productData,
    product_documents: documents || [],
  } as any;

  // Get assigned user info if any
  let assignedUser = null;
  if (orderItem.assigned_to_user_id) {
    const { data: userData } = await supabase.rpc('get_organization_users', {
      org_id: userRole.organization_id,
    });

    assignedUser = userData?.find((u: any) => u.user_id === orderItem.assigned_to_user_id);
  }

  // Map order status to equipment status
  let equipmentStatus = 'pending';
  if (orderData.status === 'active') {
    equipmentStatus = 'active';
  } else if (orderData.status === 'delivered') {
    equipmentStatus = 'delivered';
  }

  const equipment = {
    id: orderItem.id,
    order_id: orderItem.order_id,
    quantity: orderItem.quantity,
    assigned_to_user_id: orderItem.assigned_to_user_id,
    assigned_to: assignedUser
      ? {
          first_name: assignedUser.first_name,
          last_name: assignedUser.last_name,
          email: assignedUser.email,
        }
      : undefined,
    product: product,
    order: orderData,
    status: equipmentStatus,
  };

  return <EquipmentDetailClient equipment={equipment} isAdmin={isAdmin} />;
}
