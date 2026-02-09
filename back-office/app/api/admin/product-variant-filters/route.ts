import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const revalidate = 0;

// GET all filters
export async function GET() {
  try {
    const serviceClient = createServiceClient();
    
    const { data, error } = await serviceClient
      .from('product_variant_filters')
      .select('*, product_variant_filter_options(*)')
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new filter
export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    const body = await request.json();
    
    const { name, label, type, order_index } = body;

    if (!name || !label || !type) {
      return NextResponse.json(
        { error: 'name, label et type sont requis' },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from('product_variant_filters')
      .insert({
        name,
        label,
        type,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update a filter
export async function PUT(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    const body = await request.json();
    
    const { id, name, label, type, order_index } = body;

    if (!id) {
      return NextResponse.json({ error: 'id est requis' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (label !== undefined) updateData.label = label;
    if (type !== undefined) updateData.type = type;
    if (order_index !== undefined) updateData.order_index = order_index;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await serviceClient
      .from('product_variant_filters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a filter
export async function DELETE(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id est requis' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('product_variant_filters')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
