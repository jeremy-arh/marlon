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
    const { product_id, productId, quantity = 1, leasing_duration_months, durationMonths } = body;
    
    // Support both naming conventions
    const finalProductId = product_id || productId;
    const finalDurationMonths = leasing_duration_months || durationMonths;

    if (!finalProductId) {
      return NextResponse.json(
        { error: 'product_id is required' },
        { status: 400 }
      );
    }

    // Get or create cart
    let { data: cart, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cartError) {
      console.error('Error fetching cart:', cartError);
    }

    if (!cart) {
      const { data: newCart, error: createCartError } = await supabase
        .from('carts')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createCartError) {
        console.error('Error creating cart:', createCartError);
        return NextResponse.json(
          { error: 'Failed to create cart: ' + createCartError.message },
          { status: 500 }
        );
      }

      cart = newCart;
    }

    if (!cart) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve cart' },
        { status: 500 }
      );
    }

    // Add item to cart (column is 'duration_months' in DB)
    // Each variant is now a full product, no separate variant_id needed
    const { data: cartItem, error } = await supabase
      .from('cart_items')
      .insert({
        cart_id: cart.id,
        product_id: finalProductId,
        quantity,
        duration_months: finalDurationMonths,
      })
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
      console.error('Error inserting cart item:', error);
      return NextResponse.json(
        { error: 'Failed to add item: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ cartItem });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
