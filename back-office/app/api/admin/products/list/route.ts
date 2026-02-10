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
    
    // Fetch products with basic relations — only parent/standalone products (not variants)
    const { data, error } = await serviceClient
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
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Fetch categories and specialties separately to avoid join issues
    if (data && data.length > 0) {
      const productIds = data.map((p: any) => p.id);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await serviceClient
        .from('product_categories')
        .select('product_id, category_id, category:categories(name)')
        .in('product_id', productIds);

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
      }

      // Fetch specialties (only if table exists)
      let specialtiesData: any[] = [];
      try {
        const { data: specialties, error: specialtiesError } = await serviceClient
          .from('product_specialties')
          .select('product_id, specialty_id, specialty:specialties(name)')
          .in('product_id', productIds);
        
        if (!specialtiesError) {
          specialtiesData = specialties || [];
        } else {
          console.error('Error fetching specialties:', specialtiesError);
        }
      } catch (e) {
        // Table might not exist yet, ignore
        console.log('product_specialties table might not exist yet');
      }

      // Attach categories and specialties to products
      const enrichedData = data.map((product: any) => ({
        ...product,
        product_categories: categoriesData?.filter((pc: any) => pc.product_id === product.id) || [],
        product_specialties: specialtiesData?.filter((ps: any) => ps.product_id === product.id) || [],
      }));

      return NextResponse.json({ success: true, data: enrichedData });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
