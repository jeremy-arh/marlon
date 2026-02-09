import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { recalculateOrderPricesServer } from '@/lib/utils/pricing-server';
import { createOrderLog } from '@/lib/utils/order-logs';

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
    const { organization_id, leaser_id, leasing_duration_months, items } = body;

    if (!organization_id || !leaser_id || !leasing_duration_months || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis et au moins un produit doit être ajouté' },
        { status: 400 }
      );
    }

    // Get products data
    const productIds = items.map((item: any) => item.product_id);
    const { data: productsData, error: productsError } = await serviceClient
      .from('products')
      .select('id, purchase_price_ht, marlon_margin_percent')
      .in('id', productIds);

    if (productsError || !productsData || productsData.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des produits' },
        { status: 400 }
      );
    }

    // Prepare order items data
    const orderItemsData = items.map((item: any) => {
      const product = productsData.find((p: any) => p.id === item.product_id);
      if (!product) {
        throw new Error(`Produit ${item.product_id} non trouvé`);
      }

      return {
        productId: product.id,
        purchasePrice: parseFloat(product.purchase_price_ht.toString()),
        marginPercent: parseFloat(product.marlon_margin_percent.toString()),
        quantity: item.quantity,
      };
    });

    // Calculate initial total to find tranche
    let initialTotal = 0;
    orderItemsData.forEach((item) => {
      const sellingPrice = item.purchasePrice * (1 + item.marginPercent / 100);
      const itemTotal = sellingPrice * item.quantity;
      initialTotal += itemTotal;
    });

    // Recalculate prices based on total amount
    const recalculatedItems = await recalculateOrderPricesServer(
      orderItemsData,
      initialTotal,
      leaser_id,
      leasing_duration_months
    );

    if (!recalculatedItems) {
      return NextResponse.json(
        { error: 'Coefficient non trouvé pour ce montant et cette durée' },
        { status: 400 }
      );
    }

    // Calculate final total (calculatedPrice already includes quantity)
    const finalTotal = recalculatedItems.reduce(
      (sum, item) => sum + item.calculatedPrice,
      0
    );

    // Create order
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .insert({
        organization_id,
        user_id: user.id,
        status: 'draft',
        total_amount_ht: finalTotal,
        leasing_duration_months,
        leaser_id,
      })
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: orderError?.message || 'Erreur lors de la création de la commande' },
        { status: 500 }
      );
    }

    // Create order items - one per unit instead of grouping by quantity
    const orderItemsInsert: any[] = [];
    recalculatedItems.forEach((item) => {
      // Calculate price per unit (calculatedPrice includes quantity)
      const pricePerUnit = item.calculatedPrice / item.quantity;
      
      // Create one order_item per unit
      for (let i = 0; i < item.quantity; i++) {
        orderItemsInsert.push({
          order_id: order.id,
          product_id: item.productId,
          quantity: 1, // Each order_item represents a single unit
          purchase_price_ht: item.purchasePrice,
          margin_percent: item.marginPercent,
          calculated_price_ht: pricePerUnit, // Price per unit
          coefficient_used: item.coefficient,
        });
      }
    });

    const { error: itemsError } = await serviceClient
      .from('order_items')
      .insert(orderItemsInsert);

    if (itemsError) {
      // Rollback order creation
      await serviceClient.from('orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: itemsError.message || 'Erreur lors de la création des articles de commande' },
        { status: 500 }
      );
    }

    // Create log for order creation
    await createOrderLog({
      orderId: order.id,
      actionType: 'created',
      description: `Commande créée avec ${items.length} article(s)`,
      metadata: {
        organization_id,
        leaser_id,
        leasing_duration_months,
        total_amount_ht: finalTotal,
        items_count: items.length,
      },
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
