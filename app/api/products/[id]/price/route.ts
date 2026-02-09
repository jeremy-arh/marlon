import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateProductPrice } from '@/lib/utils/pricing';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const durationMonths = parseInt(searchParams.get('duration') || '36');

    const supabase = await createClient();

    // Fetch product
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

    // Calculate price
    const price = await calculateProductPrice(
      parseFloat(product.purchase_price_ht.toString()),
      parseFloat(product.marlon_margin_percent.toString()),
      product.default_leaser_id,
      durationMonths
    );

    if (!price) {
      return NextResponse.json(
        { error: 'Price calculation failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      price: {
        monthlyPrice: price.monthlyPrice,
        totalPrice: price.totalPrice,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
