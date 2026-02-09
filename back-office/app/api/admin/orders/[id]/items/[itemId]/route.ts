import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { recalculateOrderPricesServer } from '@/lib/utils/pricing-server';
import { createOrderLog } from '@/lib/utils/order-logs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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

    // Get all order items
    const { data: allItems } = await serviceClient
      .from('order_items')
      .select('*')
      .eq('order_id', params.id);

    // Update the item
    const itemToUpdate = allItems?.find((item: any) => item.id === params.itemId);
    if (!itemToUpdate) {
      return NextResponse.json(
        { error: 'Article non trouvé' },
        { status: 404 }
      );
    }

    // Prepare items for recalculation
    const itemsForRecalc = (allItems || [])
      .filter((item: any) => item.id !== params.itemId)
      .map((item: any) => ({
        productId: item.product_id,
        purchasePrice: parseFloat(item.purchase_price_ht.toString()),
        marginPercent: parseFloat(item.margin_percent.toString()),
        quantity: item.quantity,
      }));

    // Get product info
    const productId = product_id || itemToUpdate.product_id;
    const { data: product } = await serviceClient
      .from('products')
      .select('purchase_price_ht, marlon_margin_percent')
      .eq('id', productId)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    itemsForRecalc.push({
      productId,
      purchasePrice: parseFloat(product.purchase_price_ht.toString()),
      marginPercent: parseFloat(product.marlon_margin_percent.toString()),
      quantity: quantity || itemToUpdate.quantity,
    });

    // Check if leaser is set
    if (!order.leaser_id) {
      return NextResponse.json(
        { error: 'Veuillez d\'abord sélectionner un leaser pour cette commande' },
        { status: 400 }
      );
    }

    // Calculate initial total
    const initialTotal = itemsForRecalc.reduce((sum, item) => {
      const sellingPrice = item.purchasePrice * (1 + item.marginPercent / 100);
      return sum + sellingPrice * item.quantity;
    }, 0);

    // Recalculate prices
    const recalculatedItems = await recalculateOrderPricesServer(
      itemsForRecalc,
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

    // itemsForRecalc has: [other items..., updated item]
    // recalculatedItems has the same order
    // We need to map each recalculatedItem back to its order_item
    
    // Create mapping: itemsForRecalc index -> order_item
    const otherItems = (allItems || []).filter((item: any) => item.id !== params.itemId);
    const itemMapping: Map<number, any> = new Map();
    
    // Map other items (first itemsForRecalc.length - 1 items)
    for (let i = 0; i < otherItems.length; i++) {
      itemMapping.set(i, otherItems[i]);
    }
    
    // The last item in recalculatedItems is the updated one
    const updatedRecalculatedItem = recalculatedItems[recalculatedItems.length - 1];

    // Update ALL order items with the new coefficient and recalculated prices
    // This ensures all items have the same coefficient based on the total order amount
    const updatePromises: PromiseLike<any>[] = [];

    // Update other items
    for (let i = 0; i < otherItems.length; i++) {
      const orderItem = itemMapping.get(i);
      const recalculatedItem = recalculatedItems[i];
      
      if (orderItem && recalculatedItem) {
        updatePromises.push(
          serviceClient
            .from('order_items')
            .update({
              purchase_price_ht: recalculatedItem.purchasePrice,
              margin_percent: recalculatedItem.marginPercent,
              calculated_price_ht: recalculatedItem.calculatedPrice,
              coefficient_used: coefficient, // Same coefficient for all
            })
            .eq('id', orderItem.id)
        );
      }
    }

    // Update the modified item (last in recalculatedItems)
    if (updatedRecalculatedItem) {
      updatePromises.push(
        serviceClient
          .from('order_items')
          .update({
            product_id: productId,
            quantity: quantity || itemToUpdate.quantity,
            purchase_price_ht: updatedRecalculatedItem.purchasePrice,
            margin_percent: updatedRecalculatedItem.marginPercent,
            calculated_price_ht: updatedRecalculatedItem.calculatedPrice,
            coefficient_used: coefficient, // Same coefficient for all
          })
          .eq('id', params.itemId)
      );
    }

    await Promise.all(updatePromises);

    // Get the updated item to return
    const { data: orderItem, error: fetchError } = await serviceClient
      .from('order_items')
      .select('*')
      .eq('id', params.itemId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    // Update order total
    const finalTotal = recalculatedItems.reduce((sum, item) => sum + item.calculatedPrice, 0);
    await serviceClient
      .from('orders')
      .update({ total_amount_ht: finalTotal })
      .eq('id', params.id);

    // Get product name for log
    const { data: productData } = await serviceClient
      .from('products')
      .select('name')
      .eq('id', productId)
      .single();

    // Create log
    const changes: string[] = [];
    const metadata: any = {
      item_id: params.itemId,
      product_id: productId,
      product_name: productData?.name,
    };

    if (product_id && product_id !== itemToUpdate.product_id) {
      changes.push(`Produit modifié`);
      metadata.product_change = { from: itemToUpdate.product_id, to: product_id };
    }
    if (quantity && quantity !== itemToUpdate.quantity) {
      changes.push(`Quantité modifiée: ${itemToUpdate.quantity} → ${quantity}`);
      metadata.quantity_change = { from: itemToUpdate.quantity, to: quantity };
    }

    await createOrderLog({
      orderId: params.id,
      actionType: 'item_updated',
      description: changes.length > 0 
        ? `Article modifié: ${productData?.name || productId} (${changes.join(', ')})`
        : `Article modifié: ${productData?.name || productId}`,
      metadata,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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

    // Get item info before deletion
    const { data: itemToDelete } = await serviceClient
      .from('order_items')
      .select('product_id, quantity')
      .eq('id', params.itemId)
      .eq('order_id', params.id)
      .single();

    if (!itemToDelete) {
      return NextResponse.json(
        { error: 'Article non trouvé' },
        { status: 404 }
      );
    }

    // Get product name for log
    const { data: productData } = await serviceClient
      .from('products')
      .select('name')
      .eq('id', itemToDelete.product_id)
      .single();

    // Delete item
    const { error: deleteError } = await serviceClient
      .from('order_items')
      .delete()
      .eq('id', params.itemId)
      .eq('order_id', params.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // Get remaining items and recalculate total
    const { data: remainingItems } = await serviceClient
      .from('order_items')
      .select('*')
      .eq('order_id', params.id);

    if (remainingItems && remainingItems.length > 0) {
      const itemsForRecalc = remainingItems.map((item: any) => ({
        productId: item.product_id,
        purchasePrice: parseFloat(item.purchase_price_ht.toString()),
        marginPercent: parseFloat(item.margin_percent.toString()),
        quantity: item.quantity,
      }));

      const initialTotal = itemsForRecalc.reduce((sum, item) => {
        const sellingPrice = item.purchasePrice * (1 + item.marginPercent / 100);
        return sum + sellingPrice * item.quantity;
      }, 0);

      if (order.leaser_id) {
        const recalculatedItems = await recalculateOrderPricesServer(
          itemsForRecalc,
          initialTotal,
          order.leaser_id,
          order.leasing_duration_months
        );

        if (recalculatedItems) {
          const finalTotal = recalculatedItems.reduce((sum, item) => sum + item.calculatedPrice, 0);
          await serviceClient
            .from('orders')
            .update({ total_amount_ht: finalTotal })
            .eq('id', params.id);
        }
      } else {
        // No leaser, just sum the selling prices
        const finalTotal = itemsForRecalc.reduce((sum, item) => {
          const sellingPrice = item.purchasePrice * (1 + item.marginPercent / 100);
          return sum + sellingPrice * item.quantity;
        }, 0);
        await serviceClient
          .from('orders')
          .update({ total_amount_ht: finalTotal })
          .eq('id', params.id);
      }
    } else {
      // No items left, set total to 0
      await serviceClient
        .from('orders')
        .update({ total_amount_ht: 0 })
        .eq('id', params.id);
    }

    // Create log
    await createOrderLog({
      orderId: params.id,
      actionType: 'item_deleted',
      description: `Article supprimé: ${productData?.name || itemToDelete.product_id} (Quantité: ${itemToDelete.quantity})`,
      metadata: {
        item_id: params.itemId,
        product_id: itemToDelete.product_id,
        product_name: productData?.name,
        quantity: itemToDelete.quantity,
      },
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
