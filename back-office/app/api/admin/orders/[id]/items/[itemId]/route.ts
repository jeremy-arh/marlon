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

    // Find the item to update
    const itemToUpdate = allItems?.find((item: any) => item.id === params.itemId);
    if (!itemToUpdate) {
      return NextResponse.json(
        { error: 'Article non trouvé' },
        { status: 404 }
      );
    }

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

    // Get the new quantity
    const newQuantity = quantity || itemToUpdate.quantity;

    // Find all order_items for this product in this order (to replace them all)
    const itemsForThisProduct = (allItems || []).filter(
      (item: any) => item.product_id === productId
    );

    // Prepare items for recalculation (excluding all items for this product)
    const itemsForRecalc = (allItems || [])
      .filter((item: any) => item.product_id !== productId)
      .map((item: any) => ({
        productId: item.product_id,
        purchasePrice: parseFloat(item.purchase_price_ht.toString()),
        marginPercent: parseFloat(item.margin_percent.toString()),
        quantity: item.quantity,
      }));

    // Add the updated product with new quantity - utiliser les valeurs de l'order_item (pas du produit)
    itemsForRecalc.push({
      productId,
      purchasePrice: parseFloat(itemToUpdate.purchase_price_ht?.toString() || product.purchase_price_ht?.toString() || '0'),
      marginPercent: parseFloat(itemToUpdate.margin_percent?.toString() || product.marlon_margin_percent?.toString() || '0'),
      quantity: newQuantity,
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
    
    // Get other items (not for this product)
    const otherItems = (allItems || []).filter((item: any) => item.product_id !== productId);
    const itemMapping: Map<number, any> = new Map();
    
    // Map other items (first itemsForRecalc.length - 1 items)
    for (let i = 0; i < otherItems.length; i++) {
      itemMapping.set(i, otherItems[i]);
    }
    
    // The last item in recalculatedItems is the updated one
    const updatedRecalculatedItem = recalculatedItems[recalculatedItems.length - 1];

    // Update ALL other order items with the new coefficient and recalculated prices
    // This ensures all items have the same coefficient based on the total order amount
    const updatePromises: PromiseLike<any>[] = [];

    // Update other items (not for this product)
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

    await Promise.all(updatePromises);

    // Delete all order_items for this product
    const { error: deleteError } = await serviceClient
      .from('order_items')
      .delete()
      .eq('order_id', params.id)
      .eq('product_id', productId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // Create new order_items - one per unit
    if (updatedRecalculatedItem) {
      const orderItemsToInsert: any[] = [];
      const quantityNum = parseInt(newQuantity.toString());
      
      // Calculate price per unit (calculatedPrice includes quantity)
      const pricePerUnit = updatedRecalculatedItem.calculatedPrice / quantityNum;
      
      // Create one order_item per unit
      for (let i = 0; i < quantityNum; i++) {
        orderItemsToInsert.push({
          order_id: params.id,
          product_id: productId,
          quantity: 1, // Each order_item represents a single unit
          purchase_price_ht: updatedRecalculatedItem.purchasePrice,
          margin_percent: updatedRecalculatedItem.marginPercent,
          calculated_price_ht: pricePerUnit, // Price per unit
          coefficient_used: coefficient, // Same coefficient for all
        });
      }

      const { error: insertError } = await serviceClient
        .from('order_items')
        .insert(orderItemsToInsert);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    // Get one of the newly created items to return (for compatibility)
    const { data: newOrderItems, error: fetchError } = await serviceClient
      .from('order_items')
      .select('*')
      .eq('order_id', params.id)
      .eq('product_id', productId)
      .limit(1);

    if (fetchError || !newOrderItems || newOrderItems.length === 0) {
      return NextResponse.json(
        { error: fetchError?.message || 'Erreur lors de la récupération des articles' },
        { status: 500 }
      );
    }

    const orderItem = newOrderItems[0]; // Return first item for compatibility

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

    // Calculate old quantity (sum of all order_items for this product)
    const oldQuantity = itemsForThisProduct.reduce((sum: number, item: any) => sum + item.quantity, 0);

    // Create log
    const changes: string[] = [];
    const metadata: any = {
      product_id: productId,
      product_name: productData?.name,
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      items_created: newQuantity, // Number of order_items created
    };

    if (product_id && product_id !== itemToUpdate.product_id) {
      changes.push(`Produit modifié`);
      metadata.product_change = { from: itemToUpdate.product_id, to: product_id };
    }
    if (newQuantity !== oldQuantity) {
      changes.push(`Quantité modifiée: ${oldQuantity} → ${newQuantity} (${newQuantity} équipements créés)`);
      metadata.quantity_change = { from: oldQuantity, to: newQuantity };
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

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
    const { purchase_price_ht, margin_percent, monthly_price_ht } = body;

    if (purchase_price_ht === undefined && margin_percent === undefined && monthly_price_ht === undefined) {
      return NextResponse.json(
        { error: 'Fournissez au moins un champ à modifier: purchase_price_ht, margin_percent ou monthly_price_ht' },
        { status: 400 }
      );
    }

    const { data: order } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    const { data: itemToUpdate } = await serviceClient
      .from('order_items')
      .select('*')
      .eq('id', params.itemId)
      .eq('order_id', params.id)
      .single();

    if (!itemToUpdate) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 });
    }

    const { data: allItems } = await serviceClient
      .from('order_items')
      .select('*')
      .eq('order_id', params.id);

    if (!allItems || allItems.length === 0) {
      return NextResponse.json({ error: 'Aucun article' }, { status: 400 });
    }

    const durationMonths = order.leasing_duration_months || 36;

    // Cas 1: Override du prix mensuel uniquement (sans recalcul du coefficient)
    if (monthly_price_ht !== undefined && purchase_price_ht === undefined && margin_percent === undefined) {
      const newCalculatedPrice = parseFloat(monthly_price_ht) * durationMonths;
      if (isNaN(newCalculatedPrice) || newCalculatedPrice < 0) {
        return NextResponse.json({ error: 'Prix mensuel invalide' }, { status: 400 });
      }

      const { error: updateError } = await serviceClient
        .from('order_items')
        .update({ calculated_price_ht: newCalculatedPrice })
        .eq('id', params.itemId)
        .eq('order_id', params.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      const newTotal = allItems.reduce((sum: number, item: any) => {
        const price = item.id === params.itemId ? newCalculatedPrice : parseFloat(item.calculated_price_ht?.toString() || '0');
        return sum + price;
      }, 0);

      await serviceClient
        .from('orders')
        .update({ total_amount_ht: newTotal })
        .eq('id', params.id);

      const { data: productData } = await serviceClient
        .from('products')
        .select('name')
        .eq('id', itemToUpdate.product_id)
        .single();

      await createOrderLog({
        orderId: params.id,
        actionType: 'item_updated',
        description: `Prix mensuel modifié: ${productData?.name || itemToUpdate.product_id} → ${parseFloat(monthly_price_ht).toFixed(2)} €/mois HT`,
        metadata: {
          item_id: params.itemId,
          product_id: itemToUpdate.product_id,
          monthly_price_ht: parseFloat(monthly_price_ht),
          calculated_price_ht: newCalculatedPrice,
        },
        userId: user.id,
      });

      const { data: updatedItem } = await serviceClient
        .from('order_items')
        .select('*')
        .eq('id', params.itemId)
        .single();

      return NextResponse.json({ success: true, data: updatedItem });
    }

    // Cas 2: Modification prix d'achat et/ou marge → recalcul complet
    if (!order.leaser_id) {
      return NextResponse.json(
        { error: 'Veuillez d\'abord sélectionner un leaser pour cette commande' },
        { status: 400 }
      );
    }

    const newPurchasePrice = purchase_price_ht !== undefined
      ? parseFloat(purchase_price_ht)
      : parseFloat(itemToUpdate.purchase_price_ht?.toString() || '0');
    const newMarginPercent = margin_percent !== undefined
      ? parseFloat(margin_percent)
      : parseFloat(itemToUpdate.margin_percent?.toString() || '0');

    if (isNaN(newPurchasePrice) || newPurchasePrice < 0) {
      return NextResponse.json({ error: 'Prix d\'achat invalide' }, { status: 400 });
    }
    if (isNaN(newMarginPercent) || newMarginPercent < 0 || newMarginPercent > 100) {
      return NextResponse.json({ error: 'Marge invalide (0-100%)' }, { status: 400 });
    }

    const itemsForRecalc = allItems.map((item: any) => {
      if (item.id === params.itemId) {
        return {
          productId: item.product_id,
          purchasePrice: newPurchasePrice,
          marginPercent: newMarginPercent,
          quantity: item.quantity,
        };
      }
      return {
        productId: item.product_id,
        purchasePrice: parseFloat(item.purchase_price_ht?.toString() || '0'),
        marginPercent: parseFloat(item.margin_percent?.toString() || '0'),
        quantity: item.quantity,
      };
    });

    const initialTotal = itemsForRecalc.reduce((sum, item) => {
      const sellingPrice = item.purchasePrice * (1 + item.marginPercent / 100);
      return sum + sellingPrice * item.quantity;
    }, 0);

    const recalculatedItems = await recalculateOrderPricesServer(
      itemsForRecalc,
      initialTotal,
      order.leaser_id,
      durationMonths
    );

    if (!recalculatedItems) {
      return NextResponse.json(
        { error: 'Coefficient non trouvé pour ce montant et cette durée. Vérifiez les coefficients du leaser.' },
        { status: 400 }
      );
    }

    const coefficient = recalculatedItems[0]?.coefficient;
    if (!coefficient) {
      return NextResponse.json({ error: 'Erreur lors du calcul du coefficient' }, { status: 500 });
    }

    // Mise à jour de tous les order_items avec les nouvelles valeurs (ordre préservé)
    for (let i = 0; i < allItems.length; i++) {
      const orderItem = allItems[i];
      const recalc = recalculatedItems[i];
      if (!recalc) continue;

      const pricePerUnit = recalc.calculatedPrice / recalc.quantity;
      await serviceClient
        .from('order_items')
        .update({
          purchase_price_ht: recalc.purchasePrice,
          margin_percent: recalc.marginPercent,
          calculated_price_ht: pricePerUnit,
          coefficient_used: coefficient,
        })
        .eq('id', orderItem.id);
    }

    const finalTotal = recalculatedItems.reduce((sum, item) => sum + item.calculatedPrice, 0);
    await serviceClient
      .from('orders')
      .update({ total_amount_ht: finalTotal })
      .eq('id', params.id);

    const { data: productData } = await serviceClient
      .from('products')
      .select('name')
      .eq('id', itemToUpdate.product_id)
      .single();

    const changes: string[] = [];
    if (purchase_price_ht !== undefined) changes.push(`Prix d'achat: ${parseFloat(itemToUpdate.purchase_price_ht?.toString() || '0').toFixed(2)} → ${newPurchasePrice.toFixed(2)} €`);
    if (margin_percent !== undefined) changes.push(`Marge: ${parseFloat(itemToUpdate.margin_percent?.toString() || '0').toFixed(2)}% → ${newMarginPercent.toFixed(2)}%`);

    await createOrderLog({
      orderId: params.id,
      actionType: 'item_updated',
      description: `Article modifié: ${productData?.name || itemToUpdate.product_id} (${changes.join(', ')})`,
      metadata: {
        item_id: params.itemId,
        product_id: itemToUpdate.product_id,
        purchase_price_ht: newPurchasePrice,
        margin_percent: newMarginPercent,
      },
      userId: user.id,
    });

    const { data: updatedItem } = await serviceClient
      .from('order_items')
      .select('*')
      .eq('id', params.itemId)
      .single();

    return NextResponse.json({ success: true, data: updatedItem });
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

    // Delete only the specific order_item
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
