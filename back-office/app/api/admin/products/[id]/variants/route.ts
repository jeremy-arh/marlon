import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const revalidate = 0;

// GET all variants for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceClient = createServiceClient();
    
    const { data, error } = await serviceClient
      .from('product_variants')
      .select('*')
      .eq('product_id', params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new variant
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceClient = createServiceClient();
    const body = await request.json();
    
    const { sku, purchase_price_ht, marlon_margin_percent, is_active, stock_quantity, images, variant_data } = body;

    if (!variant_data || typeof variant_data !== 'object') {
      return NextResponse.json(
        { error: 'variant_data est requis et doit être un objet' },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from('product_variants')
      .insert({
        product_id: params.id,
        sku,
        purchase_price_ht,
        marlon_margin_percent,
        is_active: is_active !== undefined ? is_active : true,
        stock_quantity: stock_quantity !== undefined ? stock_quantity : 0,
        images: images !== undefined ? images : [],
        variant_data,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update a variant
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceClient = createServiceClient();
    const body = await request.json();
    
    const { variant_id, sku, purchase_price_ht, marlon_margin_percent, is_active, stock_quantity, images, variant_data } = body;

    if (!variant_id) {
      return NextResponse.json({ error: 'variant_id est requis' }, { status: 400 });
    }

    const updateData: any = {};
    if (sku !== undefined) updateData.sku = sku;
    if (purchase_price_ht !== undefined) updateData.purchase_price_ht = purchase_price_ht;
    if (marlon_margin_percent !== undefined) updateData.marlon_margin_percent = marlon_margin_percent;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (stock_quantity !== undefined) updateData.stock_quantity = stock_quantity;
    if (images !== undefined) updateData.images = images;
    if (variant_data !== undefined) updateData.variant_data = variant_data;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await serviceClient
      .from('product_variants')
      .update(updateData)
      .eq('id', variant_id)
      .eq('product_id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a variant
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const serviceClient = createServiceClient();
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variant_id');

    if (!variantId) {
      return NextResponse.json({ error: 'variant_id est requis' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('product_variants')
      .delete()
      .eq('id', variantId)
      .eq('product_id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
