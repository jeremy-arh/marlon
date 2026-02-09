import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { recalculateOrderPricesServer } from '@/lib/utils/pricing-server';
import { createOrderLog } from '@/lib/utils/order-logs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { product_id, quantity } = body;

    if (!product_id || !quantity) {
      return NextResponse.json(
        { error: 'Le produit et la quantité sont requis' },
        { status: 400 }
      );
    }

    // Get order
    const { data: order } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Get product
    const { data: product } = await serviceClient
      .from('products')
      .select('purchase_price_ht, marlon_margin_percent')
      .eq('id', product_id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    // Get all order items
    const { data: existingItems } = await serviceClient
      .from('order_items')
      .select('*')
      .eq('order_id', params.id);

    // Prepare items for recalculation
    const allItems = [
      ...(existingItems || []).map((item: any) => ({
        productId: item.product_id,
        purchasePrice: parseFloat(item.purchase_price_ht.toString()),
        marginPercent: parseFloat(item.margin_percent.toString()),
        quantity: item.quantity,
      })),
      {
        productId: product_id,
        purchasePrice: parseFloat(product.purchase_price_ht.toString()),
        marginPercent: parseFloat(product.marlon_margin_percent.toString()),
        quantity: parseInt(quantity),
      },
    ];

    // Check if leaser is set
    if (!order.leaser_id) {
      return NextResponse.json(
        { error: 'Veuillez d\'abord sélectionner un leaser pour cette commande' },
        { status: 400 }
      );
    }

    // Calculate initial total
    const initialTotal = allItems.reduce((sum, item) => {
      const sellingPrice = item.purchasePrice * (1 + item.marginPercent / 100);
      return sum + sellingPrice * item.quantity;
    }, 0);

    // Recalculate prices
    const recalculatedItems = await recalculateOrderPricesServer(
      allItems,
      initialTotal,
      order.leaser_id,
      order.leasing_duration_months
    );

    if (!recalculatedItems) {
      return NextResponse.json(
        { error: 'Coefficient non trouvé pour ce montant et cette durée. Veuillez vérifier que des coefficients sont configurés pour ce leaser.' },
        { status: 400 }
      );
    }

    // Get the coefficient - it should be the same for all items
    const coefficient = recalculatedItems[0]?.coefficient;
    if (!coefficient) {
      return NextResponse.json(
        { error: 'Erreur lors du calcul du coefficient' },
        { status: 500 }
      );
    }

    // recalculatedItems order: [existing items..., new item]
    // Update ALL existing items with the new coefficient and recalculated prices
    const existingItemsCount = existingItems?.length || 0;
    const updatePromises: PromiseLike<any>[] = [];

    for (let i = 0; i < existingItemsCount; i++) {
      const existingItem = existingItems![i];
      const recalculatedItem = recalculatedItems[i];
      
      if (recalculatedItem) {
        updatePromises.push(
          serviceClient
            .from('order_items')
            .update({
              purchase_price_ht: recalculatedItem.purchasePrice,
              margin_percent: recalculatedItem.marginPercent,
              calculated_price_ht: recalculatedItem.calculatedPrice,
              coefficient_used: coefficient, // Same coefficient for all
            })
            .eq('id', existingItem.id)
        );
      }
    }

    await Promise.all(updatePromises);

    // Find the new item (last in recalculatedItems)
    const newItem = recalculatedItems[recalculatedItems.length - 1];
    if (!newItem || newItem.productId !== product_id) {
      return NextResponse.json(
        { error: 'Erreur lors du calcul du prix' },
        { status: 500 }
      );
    }

    // Insert new order items - one per unit instead of grouping by quantity
    const orderItemsToInsert: any[] = [];
    const quantityNum = parseInt(quantity);
    
    // Calculate price per unit (calculatedPrice includes quantity)
    const pricePerUnit = newItem.calculatedPrice / quantityNum;
    
    // Create one order_item per unit
    for (let i = 0; i < quantityNum; i++) {
      orderItemsToInsert.push({
        order_id: params.id,
        product_id,
        quantity: 1, // Each order_item represents a single unit
        purchase_price_ht: newItem.purchasePrice,
        margin_percent: newItem.marginPercent,
        calculated_price_ht: pricePerUnit, // Price per unit
        coefficient_used: coefficient, // Same coefficient for all
      });
    }

    const { data: orderItems, error: insertError } = await serviceClient
      .from('order_items')
      .insert(orderItemsToInsert)
      .select();
    
    const orderItem = orderItems?.[0]; // Return first item for compatibility

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // Update order total (calculatedPrice already includes quantity)
    const finalTotal = recalculatedItems.reduce((sum, item) => sum + item.calculatedPrice, 0);
    await serviceClient
      .from('orders')
      .update({ total_amount_ht: finalTotal })
      .eq('id', params.id);

    // Get product name for log
    const { data: productData } = await serviceClient
      .from('products')
      .select('name')
      .eq('id', product_id)
      .single();

    // Create log
    await createOrderLog({
      orderId: params.id,
      actionType: 'item_added',
      description: `Article ajouté: ${productData?.name || product_id} (Quantité: ${quantity})`,
      metadata: {
        product_id,
        product_name: productData?.name,
        quantity,
        calculated_price_ht: newItem.calculatedPrice,
        coefficient_used: coefficient,
      },
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: orderItem });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
