import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    
    // Fetch products with all relations as nested selects
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
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Count variants (child products) for each parent
    const { data: childCountsData } = await serviceClient
      .from('products')
      .select('parent_product_id')
      .not('parent_product_id', 'is', null);

    const childCounts: Record<string, number> = {};
    (childCountsData || []).forEach((c: any) => {
      childCounts[c.parent_product_id] = (childCounts[c.parent_product_id] || 0) + 1;
    });

    const enrichedProducts = (productsData || []).map((product: any) => ({
      ...product,
      pricesByDuration: {} as Record<number, { monthly: number; total: number }>,
      variantCount: childCounts[product.id] || 0,
    }));

    return NextResponse.json({ success: true, data: enrichedProducts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
