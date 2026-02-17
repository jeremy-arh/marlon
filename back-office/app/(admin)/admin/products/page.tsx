import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProductsClient from './ProductsClient';

export default async function ProductsPage() {
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

  // Load products server-side with nested relations (categories + specialties included)
  // This avoids .in() queries with hundreds of IDs which exceed URL length limits
  const { data: productsData, error } = await serviceClient
    .from('products')
    .select(`
      *,
      brand:brands(name),
      supplier:suppliers(name),
      default_leaser:leasers(name),
      product_images(image_url, order_index),
      product_categories(category_id, category:categories(name)),
      product_specialties(specialty_id, specialty:specialties(name))
    `)
    .is('parent_product_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
  }

  // Load leasing durations
  const { data: durations } = await serviceClient
    .from('leasing_durations')
    .select('*')
    .order('months', { ascending: true });

  // Load leasers for inline dropdown
  const { data: leasers } = await serviceClient
    .from('leasers')
    .select('id, name')
    .order('name');

  // Load categories for inline dropdown
  const { data: categories } = await serviceClient
    .from('categories')
    .select('id, name, product_type')
    .order('name');

  // Count child products (variants) — fetch all variants at once
  const { data: childCountsData } = await serviceClient
    .from('products')
    .select('parent_product_id')
    .not('parent_product_id', 'is', null);

  const childCounts: Record<string, number> = {};
  (childCountsData || []).forEach((c: any) => {
    childCounts[c.parent_product_id] = (childCounts[c.parent_product_id] || 0) + 1;
  });

  // Enrich with variant count only (price calculation moved to client/on-demand to avoid timeout)
  const enrichedProducts = (productsData || []).map((product: any) => ({
    ...product,
    pricesByDuration: {} as Record<number, { monthly: number; total: number }>,
    variantCount: childCounts[product.id] || 0,
  }));

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      <ProductsClient
        initialProducts={enrichedProducts}
        durations={durations || []}
        leasers={leasers || []}
        categories={categories || []}
      />
    </div>
  );
}
