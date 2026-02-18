import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { recalculateOrderPricesServer } from '@/lib/utils/pricing-server';
import { createOrderLog } from '@/lib/utils/order-logs';

export async function GET(
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

    const { data: order, error } = await serviceClient
      .from('orders')
      .select(`
        *,
        organization:organizations(
          id,
          name,
          siret,
          email,
          phone,
          address,
          city,
          postal_code,
          country
        ),
        leaser:leasers(
          id,
          name,
          contact_email,
          contact_phone
        ),
        order_items(
          *,
          product:products(
            id,
            name,
            reference,
            purchase_price_ht,
            marlon_margin_percent,
            product_images(
              image_url,
              order_index
            )
          )
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { leaser_id, status, leasing_duration_months } = body;

    // Get current order to check if we need to recalculate prices
    const { data: currentOrder } = await serviceClient
      .from('orders')
      .select('*, order_items(*, product:products(*))')
      .eq('id', params.id)
      .single();

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    const updates: any = {};
    if (leaser_id !== undefined) updates.leaser_id = leaser_id || null;
    if (status !== undefined) updates.status = status;
    
    const newDurationMonths = leasing_duration_months !== undefined 
      ? leasing_duration_months 
      : currentOrder.leasing_duration_months;
    // Use the explicitly provided leaser_id if defined, otherwise keep current
    const newLeaserId = leaser_id !== undefined 
      ? (leaser_id || null) 
      : currentOrder.leaser_id;

    // Recalculate prices if duration or leaser changed and we have a valid leaser
    const needsRecalculation = leasing_duration_months !== undefined || leaser_id !== undefined;
    if (needsRecalculation && newLeaserId) {
      // Get all order items
      const { data: orderItems } = await serviceClient
        .from('order_items')
        .select('*')
        .eq('order_id', params.id);

      if (orderItems && orderItems.length > 0) {
        const itemsForRecalc = orderItems.map((item: any) => ({
          productId: item.product_id,
          purchasePrice: parseFloat(item.purchase_price_ht.toString()),
          marginPercent: parseFloat(item.margin_percent.toString()),
          quantity: item.quantity,
        }));

        // Calculate initial total (sum of selling prices)
        const initialTotal = itemsForRecalc.reduce((sum, item) => {
          const sellingPrice = item.purchasePrice * (1 + item.marginPercent / 100);
          return sum + sellingPrice * item.quantity;
        }, 0);

        // Recalculate prices with new duration/leaser
        const recalculatedItems = await recalculateOrderPricesServer(
          itemsForRecalc,
          initialTotal,
          newLeaserId,
          newDurationMonths
        );

        if (!recalculatedItems) {
          return NextResponse.json(
            { error: 'Coefficient non trouvé pour ce montant et cette durée. Veuillez vérifier que des coefficients sont configurés pour ce leaser.' },
            { status: 400 }
          );
        }

        // Update all order items with new prices
        const updatePromises = orderItems.map((orderItem: any) => {
          const recalculatedItem = recalculatedItems.find(
            (item) => item.productId === orderItem.product_id && item.quantity === orderItem.quantity
          );
          if (recalculatedItem) {
            return serviceClient
              .from('order_items')
              .update({
                calculated_price_ht: recalculatedItem.calculatedPrice,
                coefficient_used: recalculatedItem.coefficient,
              })
              .eq('id', orderItem.id);
          }
          return Promise.resolve();
        });

        await Promise.all(updatePromises);

        // Calculate new total
        const newTotal = recalculatedItems.reduce((sum, item) => sum + item.calculatedPrice, 0);
        updates.total_amount_ht = newTotal;
      }
    } else if (needsRecalculation && !newLeaserId) {
      // Leaser was cleared — no recalculation possible, just update the order
      // Keep existing prices as-is (they were calculated with the previous leaser)
    }

    if (leasing_duration_months !== undefined) {
      updates.leasing_duration_months = leasing_duration_months;
    }

    // Update order
    const { data, error } = await serviceClient
      .from('orders')
      .update(updates)
      .eq('id', params.id)
      .select(`
        *,
        organization:organizations(name),
        leaser:leasers(name),
        order_items(
          *,
          product:products(name, purchase_price_ht, marlon_margin_percent)
        )
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Create logs for changes
    const changes: string[] = [];
    const metadata: any = {};

    if (status !== undefined && status !== currentOrder.status) {
      changes.push(`Statut modifié: ${currentOrder.status} → ${status}`);
      metadata.status_change = { from: currentOrder.status, to: status };
      await createOrderLog({
        orderId: params.id,
        actionType: 'status_changed',
        description: `Statut modifié: ${currentOrder.status} → ${status}`,
        metadata: metadata.status_change,
        userId: user.id,
      });

      // Sync order_tracking pour que les steps (Financement, Contrat, Livraison, Actif) reflètent le statut
      const { data: existingTracking } = await serviceClient
        .from('order_tracking')
        .select('*')
        .eq('order_id', params.id)
        .maybeSingle();

      const statusProgression = ['draft', 'pending', 'sent_to_leaser', 'leaser_accepted', 'contract_uploaded', 'processing', 'shipped', 'delivered'];
      const statusIndex = statusProgression.indexOf(status);
      const trackingUpdates: Record<string, string> = {};

      if (status === 'cancelled') {
        // Pas de mise à jour du tracking pour annulé
      } else if (status === 'draft' || status === 'pending') {
        // En attente/brouillon : toutes les étapes à pending
        trackingUpdates.financing_status = 'pending';
        trackingUpdates.contract_status = 'pending';
        trackingUpdates.delivery_status = 'pending';
      } else {
        // Progression : mettre à jour selon le statut
        if (statusIndex >= statusProgression.indexOf('sent_to_leaser')) {
          trackingUpdates.financing_status = existingTracking?.financing_status || 'validated';
        }
        if (statusIndex >= statusProgression.indexOf('contract_uploaded')) {
          trackingUpdates.contract_status = existingTracking?.contract_status || 'signed';
        }
        if (status === 'shipped') {
          trackingUpdates.delivery_status = 'in_transit';
        } else if (status === 'delivered') {
          trackingUpdates.delivery_status = 'delivered';
        }
      }

      if (Object.keys(trackingUpdates).length > 0) {
        if (existingTracking) {
          await serviceClient
            .from('order_tracking')
            .update(trackingUpdates)
            .eq('order_id', params.id);
        } else {
          await serviceClient
            .from('order_tracking')
            .insert({
              order_id: params.id,
              ...trackingUpdates,
            });
        }
      }

      // If order is cancelled, delete all associated order_items (equipments)
      if (status === 'cancelled') {
        const { error: deleteError } = await serviceClient
          .from('order_items')
          .delete()
          .eq('order_id', params.id);

        if (deleteError) {
          console.error('Error deleting order items:', deleteError);
        } else {
          await createOrderLog({
            orderId: params.id,
            actionType: 'items_deleted',
            description: `Équipements supprimés suite à l'annulation/refus de la commande`,
            metadata: { reason: status },
            userId: user.id,
          });
        }
      }
    }

    if (leaser_id !== undefined && leaser_id !== currentOrder.leaser_id) {
      changes.push(`Leaser modifié`);
      metadata.leaser_change = { from: currentOrder.leaser_id, to: leaser_id };
      await createOrderLog({
        orderId: params.id,
        actionType: 'updated',
        description: 'Leaser modifié',
        metadata: metadata.leaser_change,
        userId: user.id,
      });
    }

    if (leasing_duration_months !== undefined && leasing_duration_months !== currentOrder.leasing_duration_months) {
      changes.push(`Durée modifiée: ${currentOrder.leasing_duration_months} → ${leasing_duration_months} mois`);
      metadata.duration_change = { from: currentOrder.leasing_duration_months, to: leasing_duration_months };
      await createOrderLog({
        orderId: params.id,
        actionType: 'updated',
        description: `Durée modifiée: ${currentOrder.leasing_duration_months} → ${leasing_duration_months} mois`,
        metadata: metadata.duration_change,
        userId: user.id,
      });
    }

    if (changes.length === 0) {
      await createOrderLog({
        orderId: params.id,
        actionType: 'updated',
        description: 'Commande mise à jour',
        metadata: updates,
        userId: user.id,
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { data: order, error: fetchError } = await serviceClient
      .from('orders')
      .select('id')
      .eq('id', params.id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await serviceClient
      .from('orders')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
