import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const revalidate = 0;

// GET all filters (public)
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('product_variant_filters')
      .select('*, product_variant_filter_options(*)')
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
