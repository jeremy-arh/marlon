import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const revalidate = 0;

// GET all options for a filter
export async function GET(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    const { searchParams } = new URL(request.url);
    const filterId = searchParams.get('filter_id');

    let query = serviceClient
      .from('product_variant_filter_options')
      .select('*')
      .order('order_index', { ascending: true });

    if (filterId) {
      query = query.eq('filter_id', filterId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new option
export async function POST(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    const body = await request.json();
    
    const { filter_id, value, label, order_index } = body;

    if (!filter_id || !value || !label) {
      return NextResponse.json(
        { error: 'filter_id, value et label sont requis' },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from('product_variant_filter_options')
      .insert({
        filter_id,
        value,
        label,
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

// PUT update an option
export async function PUT(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    const body = await request.json();
    
    const { id, filter_id, value, label, order_index } = body;

    if (!id) {
      return NextResponse.json({ error: 'id est requis' }, { status: 400 });
    }

    const updateData: any = {};
    if (filter_id !== undefined) updateData.filter_id = filter_id;
    if (value !== undefined) updateData.value = value;
    if (label !== undefined) updateData.label = label;
    if (order_index !== undefined) updateData.order_index = order_index;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await serviceClient
      .from('product_variant_filter_options')
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

// DELETE an option
export async function DELETE(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id est requis' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('product_variant_filter_options')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
