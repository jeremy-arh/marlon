import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProductsClient from './ProductsClient';
import { calculateProductPriceServer } from '@/lib/utils/pricing-server';

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

  // Load products server-side — only parent products and standalone products (not variants)
  const { data: productsData, error } = await serviceClient
    .from('products')
    .select(`
      *,
      brand:brands(name),
      supplier:suppliers(name),
      default_leaser:leasers(name),
      product_images(image_url, order_index)
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

  // Fetch categories and specialties separately
  let enrichedProducts = productsData || [];
  if (productsData && productsData.length > 0) {
    const productIds = productsData.map((p: any) => p.id);
    
    const { data: categoriesData } = await serviceClient
      .from('product_categories')
      .select('product_id, category_id, category:categories(name)')
      .in('product_id', productIds);

    let specialtiesData: any[] = [];
    try {
      const { data: specialties } = await serviceClient
        .from('product_specialties')
        .select('product_id, specialty_id, specialty:specialties(name)')
        .in('product_id', productIds);
      specialtiesData = specialties || [];
    } catch (e) {
      // Table might not exist yet
    }

    // Count child products (variants) per parent
    const { data: childCountsData } = await serviceClient
      .from('products')
      .select('parent_product_id')
      .in('parent_product_id', productIds);
    
    const childCounts: Record<string, number> = {};
    (childCountsData || []).forEach((c: any) => {
      childCounts[c.parent_product_id] = (childCounts[c.parent_product_id] || 0) + 1;
    });

    // Calculate prices for each product and duration
    enrichedProducts = await Promise.all(
      productsData.map(async (product: any) => {
        const pricesByDuration: Record<number, { monthly: number; total: number }> = {};
        
        if (product.default_leaser_id && durations) {
          for (const duration of durations) {
            const priceCalc = await calculateProductPriceServer(
              parseFloat(product.purchase_price_ht.toString()),
              parseFloat(product.marlon_margin_percent.toString()),
              product.default_leaser_id,
              duration.months
            );
            
            if (priceCalc) {
              pricesByDuration[duration.months] = {
                monthly: priceCalc.monthlyPrice,
                total: priceCalc.totalPrice,
              };
            }
          }
        }

        return {
          ...product,
          product_categories: categoriesData?.filter((pc: any) => pc.product_id === product.id) || [],
          product_specialties: specialtiesData?.filter((ps: any) => ps.product_id === product.id) || [],
          pricesByDuration,
          variantCount: childCounts[product.id] || 0,
        };
      })
    );
  }

  return (
    <div className="container mx-auto bg-gray-50 px-4 py-6 lg:px-6 lg:py-8">
      <ProductsClient initialProducts={enrichedProducts} durations={durations || []} />
    </div>
  );
}
