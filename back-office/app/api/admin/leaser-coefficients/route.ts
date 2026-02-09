import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { recalculateOrderPricesServer, calculateSellingPrice } from '@/lib/utils/pricing-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('leaser_coefficients')
      .select('leaser_id');

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
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
    const { leaser_id, duration_id, min_amount, max_amount, coefficient } = body;

    if (!leaser_id || !duration_id || min_amount === undefined || !coefficient) {
      return NextResponse.json(
        { error: 'Les champs leaser_id, duration_id, min_amount et coefficient sont requis' },
        { status: 400 }
      );
    }

    // Check for overlapping ranges
    const { data: existingCoefficients } = await serviceClient
      .from('leaser_coefficients')
      .select('*')
      .eq('leaser_id', leaser_id)
      .eq('duration_id', duration_id);

    if (existingCoefficients) {
      for (const existing of existingCoefficients) {
        const existingMin = parseFloat(existing.min_amount);
        const existingMax = existing.max_amount ? parseFloat(existing.max_amount) : Infinity;
        const newMin = parseFloat(min_amount);
        const newMax = max_amount ? parseFloat(max_amount) : Infinity;

        // Check for overlap
        if (
          (newMin >= existingMin && newMin < existingMax) ||
          (newMax > existingMin && newMax <= existingMax) ||
          (newMin <= existingMin && newMax >= existingMax)
        ) {
          return NextResponse.json(
            {
              error: `Cette tranche chevauche une tranche existante (${existingMin}€ - ${existingMax === Infinity ? '∞' : existingMax + '€'})`,
            },
            { status: 400 }
          );
        }
      }
    }

    const { data, error } = await serviceClient
      .from('leaser_coefficients')
      .insert({
        leaser_id,
        duration_id,
        min_amount,
        max_amount: max_amount || null,
        coefficient,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get duration months for recalculation
    const { data: duration } = await serviceClient
      .from('leasing_durations')
      .select('months')
      .eq('id', duration_id)
      .single();

    if (duration) {
      // Recalculate prices for non-validated orders
      await recalculateOrdersForCoefficient(
        serviceClient,
        leaser_id,
        duration.months
      );

      // Recalculate prices for cart items
      await recalculateCartItemsForCoefficient(
        serviceClient,
        leaser_id,
        duration.months
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Recalculate prices for all non-validated orders using a specific leaser and duration
 */
async function recalculateOrdersForCoefficient(
  serviceClient: any,
  leaserId: string,
  durationMonths: number
) {
  // Find all non-validated orders (not delivered or cancelled) with this leaser and duration
  const { data: orders } = await serviceClient
    .from('orders')
    .select('id, leaser_id, leasing_duration_months, total_amount_ht')
    .eq('leaser_id', leaserId)
    .eq('leasing_duration_months', durationMonths)
    .not('status', 'eq', 'delivered')
    .not('status', 'eq', 'cancelled');

  if (!orders || orders.length === 0) {
    return;
  }

  for (const order of orders) {
    // Get all order items
    const { data: orderItems } = await serviceClient
      .from('order_items')
      .select('id, product_id, quantity, purchase_price_ht, margin_percent')
      .eq('order_id', order.id);

    if (!orderItems || orderItems.length === 0) {
      continue;
    }

    // Prepare items for recalculation
    const itemsForRecalc = orderItems.map((item: any) => ({
      productId: item.product_id,
      purchasePrice: parseFloat(item.purchase_price_ht.toString()),
      marginPercent: parseFloat(item.margin_percent.toString()),
      quantity: item.quantity,
    }));

    // Calculate initial total (selling price * quantity)
    const initialTotal = itemsForRecalc.reduce((sum: number, item: any) => {
      const sellingPrice = calculateSellingPrice(item.purchasePrice, item.marginPercent);
      return sum + (sellingPrice * item.quantity);
    }, 0);

    // Recalculate prices
    const recalculatedItems = await recalculateOrderPricesServer(
      itemsForRecalc,
      initialTotal,
      leaserId,
      durationMonths
    );

    if (!recalculatedItems) {
      continue; // Skip if coefficient not found
    }

    // Update all order items with new prices and coefficients
    const updatePromises = recalculatedItems.map(async (recalcItem: any) => {
      const originalItem = orderItems.find(
        (item: any) => item.product_id === recalcItem.productId && item.quantity === recalcItem.quantity
      );
      
      if (originalItem) {
        return serviceClient
          .from('order_items')
          .update({
            calculated_price_ht: recalcItem.calculatedPrice,
            coefficient_used: recalcItem.coefficient,
          })
          .eq('id', originalItem.id);
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    // Update order total
    const finalTotal = recalculatedItems.reduce((sum: number, item: any) => sum + item.calculatedPrice, 0);
    await serviceClient
      .from('orders')
      .update({ total_amount_ht: finalTotal })
      .eq('id', order.id);
  }
}

/**
 * Recalculate prices for all cart items using a specific leaser and duration
 */
async function recalculateCartItemsForCoefficient(
  serviceClient: any,
  leaserId: string,
  durationMonths: number
) {
  // Find all cart items with products that have this leaser as default and matching duration
  const { data: cartItems } = await serviceClient
    .from('cart_items')
    .select(`
      id,
      product_id,
      quantity,
      duration_months,
      product:products(
        id,
        purchase_price_ht,
        marlon_margin_percent,
        default_leaser_id
      )
    `)
    .eq('duration_months', durationMonths);

  if (!cartItems || cartItems.length === 0) {
    return;
  }

  for (const cartItem of cartItems) {
    const product = cartItem.product;
    if (!product || product.default_leaser_id !== leaserId) {
      continue;
    }

    const purchasePrice = parseFloat(product.purchase_price_ht.toString());
    const marginPercent = parseFloat(product.marlon_margin_percent.toString());
    const sellingPrice = calculateSellingPrice(purchasePrice, marginPercent);

    // Get coefficient for this single product amount
    const { data: duration } = await serviceClient
      .from('leasing_durations')
      .select('id')
      .eq('months', durationMonths)
      .single();

    if (!duration) {
      continue;
    }

    // Find coefficient for this amount - try bounded ranges first
    let coefficientData = null;
    const { data: boundedData } = await serviceClient
      .from('leaser_coefficients')
      .select('coefficient')
      .eq('leaser_id', leaserId)
      .eq('duration_id', duration.id)
      .lte('min_amount', sellingPrice)
      .not('max_amount', 'is', null)
      .gte('max_amount', sellingPrice)
      .order('min_amount', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (boundedData) {
      coefficientData = boundedData;
    } else {
      // Try unbounded range
      const { data: unboundedData } = await serviceClient
        .from('leaser_coefficients')
        .select('coefficient')
        .eq('leaser_id', leaserId)
        .eq('duration_id', duration.id)
        .is('max_amount', null)
        .lte('min_amount', sellingPrice)
        .order('min_amount', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (unboundedData) {
        coefficientData = unboundedData;
      }
    }

    if (!coefficientData) {
      continue;
    }

    const coefficient = parseFloat(coefficientData.coefficient.toString());
    const monthlyPrice = (sellingPrice * coefficient) / 100;
    const totalPrice = monthlyPrice * durationMonths * cartItem.quantity;

    // Update cart item
    await serviceClient
      .from('cart_items')
      .update({
        calculated_monthly_price: monthlyPrice,
        calculated_total_price: totalPrice,
      })
      .eq('id', cartItem.id);
  }
}
