import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let cart;

    if (user) {
      // Get user's cart
      const { data, error } = await supabase
        .from('carts')
        .select(`
          *,
          cart_items(
            *,
            products(
              id,
              name,
              reference,
              purchase_price_ht,
              marlon_margin_percent,
              default_leaser_id,
              product_images(image_url, order_index)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      cart = data;
    } else {
      // For anonymous users, use session-based cart (stored client-side)
      return NextResponse.json({ cart: null, items: [] });
    }

    return NextResponse.json({
      cart: cart || null,
      items: cart?.cart_items || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { product_id, productId, quantity = 1, leasing_duration_months, durationMonths, variant_id } = body;
    
    // Support both naming conventions
    const finalProductId = product_id || productId;
    const finalDurationMonths = leasing_duration_months || durationMonths;

    // Get or create cart
    let { data: cart } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!cart) {
      const { data: newCart } = await supabase
        .from('carts')
        .insert({ user_id: user.id })
        .select()
        .single();

      cart = newCart;
    }

    if (!cart) {
      throw new Error('Failed to create cart');
    }

    // Add item to cart (column is 'duration_months' in DB)
    const insertData: any = {
      cart_id: cart.id,
      product_id: finalProductId,
      quantity,
      duration_months: finalDurationMonths,
    };
    
    // Add variant_id if provided
    if (variant_id) {
      insertData.variant_id = variant_id;
    }
    
    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .insert(insertData)
      .select(`
        *,
        products(
          id,
          name,
          reference
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ cartItem });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
