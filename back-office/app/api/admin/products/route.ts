import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
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
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { name, reference, description, technical_info, product_type, serial_number, purchase_price_ht, marlon_margin_percent, supplier_id, brand_id, default_leaser_id, category_ids, specialty_ids, images } = body;

    if (!name || !purchase_price_ht || !marlon_margin_percent || !product_type) {
      return NextResponse.json({ error: 'Les champs nom, type, prix d\'achat et marge sont requis' }, { status: 400 });
    }

    const { data: product, error } = await serviceClient
      .from('products')
      .insert({
        name,
        reference: reference || null,
        description: description || null,
        technical_info: technical_info || null,
        product_type,
        serial_number: serial_number || null,
        purchase_price_ht,
        marlon_margin_percent,
        supplier_id: supplier_id || null,
        brand_id: brand_id || null,
        default_leaser_id: default_leaser_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Insert product images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      const imageRecords = images.map((url: string, index: number) => ({
        product_id: product.id,
        image_url: url,
        order_index: index,
      }));

      await serviceClient
        .from('product_images')
        .insert(imageRecords);
    }

    // Insert product categories if provided
    if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
      const categoryRecords = category_ids.map((categoryId: string) => ({
        product_id: product.id,
        category_id: categoryId,
      }));

      await serviceClient
        .from('product_categories')
        .insert(categoryRecords);
    }

    // Insert product specialties if provided (only for medical equipment)
    if (product_type === 'medical_equipment' && specialty_ids && Array.isArray(specialty_ids) && specialty_ids.length > 0) {
      const specialtyRecords = specialty_ids.map((specialtyId: string) => ({
        product_id: product.id,
        specialty_id: specialtyId,
      }));

      await serviceClient
        .from('product_specialties')
        .insert(specialtyRecords);
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
