import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const durationMonths = parseInt(searchParams.get('duration') || '36');

    const supabase = await createClient();

    const { data: product } = await supabase
      .from('products')
      .select('purchase_price_ht, marlon_margin_percent, default_leaser_id')
      .eq('id', params.id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (!product.default_leaser_id) {
      return NextResponse.json(
        { error: 'No leaser configured for this product' },
        { status: 400 }
      );
    }

    const purchasePrice = parseFloat(product.purchase_price_ht.toString());
    const marginPercent = parseFloat(product.marlon_margin_percent.toString());
    const sellingPrice = purchasePrice * (1 + marginPercent / 100);

    const { data: duration } = await supabase
      .from('leasing_durations')
      .select('id')
      .eq('months', durationMonths)
      .single();

    if (!duration) {
      return NextResponse.json(
        { error: 'Invalid duration' },
        { status: 400 }
      );
    }

    const { data: coeffData } = await supabase
      .from('leaser_coefficients')
      .select('coefficient')
      .eq('leaser_id', product.default_leaser_id)
      .eq('duration_id', duration.id)
      .gte('max_amount', sellingPrice)
      .lte('min_amount', sellingPrice)
      .single();

    if (!coeffData) {
      return NextResponse.json(
        { error: 'No coefficient found for this configuration' },
        { status: 400 }
      );
    }

    const coefficient = parseFloat(coeffData.coefficient.toString());
    const monthlyPrice = (sellingPrice * coefficient) / 100;
    const totalPrice = monthlyPrice * durationMonths;

    return NextResponse.json({
      success: true,
      price: {
        monthlyPrice,
        totalPrice,
        coefficient,
        sellingPrice,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
