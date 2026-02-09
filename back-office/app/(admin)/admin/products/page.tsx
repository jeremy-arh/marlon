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

  // Load products server-side
  const { data: productsData, error } = await serviceClient
    .from('products')
    .select(`
      *,
      brand:brands(name),
      supplier:suppliers(name),
      default_leaser:leasers(name),
      product_images(image_url, order_index)
    `)
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

    // Load variants for IT equipment products
    const itProductIds = productsData.filter((p: any) => p.product_type === 'it_equipment').map((p: any) => p.id);
    let variantsData: any[] = [];
    if (itProductIds.length > 0) {
      const { data: variants } = await serviceClient
        .from('product_variants')
        .select('*')
        .in('product_id', itProductIds)
        .eq('is_active', true);
      variantsData = variants || [];
    }

    // Load variant filters and options for display
    let variantFiltersData: any[] = [];
    let variantFilterOptionsData: any[] = [];
    try {
      const { data: filters } = await serviceClient
        .from('product_variant_filters')
        .select('*')
        .order('order_index', { ascending: true });
      variantFiltersData = filters || [];

      if (variantFiltersData.length > 0) {
        const filterIds = variantFiltersData.map((f: any) => f.id);
        const { data: options } = await serviceClient
          .from('product_variant_filter_options')
          .select('*')
          .in('filter_id', filterIds)
          .order('order_index', { ascending: true });
        variantFilterOptionsData = options || [];
      }
    } catch (e) {
      // Tables might not exist yet
    }

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

        // Calculate prices for variants if IT equipment
        const variants = variantsData.filter((v: any) => v.product_id === product.id);
        const variantsWithPrices: any[] = [];

        if (product.product_type === 'it_equipment' && variants.length > 0 && product.default_leaser_id && durations) {
          for (const variant of variants) {
            const variantPricesByDuration: Record<number, { monthly: number; total: number }> = {};
            
            for (const duration of durations) {
              if (variant.purchase_price_ht && variant.marlon_margin_percent) {
                const variantPriceCalc = await calculateProductPriceServer(
                  parseFloat(variant.purchase_price_ht.toString()),
                  parseFloat(variant.marlon_margin_percent.toString()),
                  product.default_leaser_id,
                  duration.months
                );
                
                if (variantPriceCalc) {
                  variantPricesByDuration[duration.months] = {
                    monthly: variantPriceCalc.monthlyPrice,
                    total: variantPriceCalc.totalPrice,
                  };
                }
              }
            }

            // Build variant display name from variant_data
            const variantData = variant.variant_data || {};
            const variantLabels: string[] = [];
            
            for (const filter of variantFiltersData) {
              const value = variantData[filter.name];
              if (value) {
                const option = variantFilterOptionsData.find((opt: any) => opt.filter_id === filter.id && opt.value === value);
                if (option) {
                  variantLabels.push(`${filter.label}: ${option.label}`);
                }
              }
            }

            variantsWithPrices.push({
              ...variant,
              displayName: variantLabels.length > 0 ? variantLabels.join(', ') : 'Variante',
              pricesByDuration: variantPricesByDuration,
            });
          }
        }

        return {
          ...product,
          product_categories: categoriesData?.filter((pc: any) => pc.product_id === product.id) || [],
          product_specialties: specialtiesData?.filter((ps: any) => ps.product_id === product.id) || [],
          pricesByDuration,
          variants: variantsWithPrices,
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
