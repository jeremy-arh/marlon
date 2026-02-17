import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { createOrderLog } from '@/lib/utils/order-logs';

/**
 * PATCH: Modifier les totaux affichés dans le Résumé - OVERRIDES uniquement.
 * Ne modifie PAS les order_items. Stocke des valeurs d'affichage sur la commande.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data: userRole } = await serviceClient
      .from('user_roles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .maybeSingle();

    if (!userRole) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { total_purchase_price_ht, total_ca_marlon_ht, total_monthly_ttc } = body;

    if (
      total_purchase_price_ht === undefined &&
      total_ca_marlon_ht === undefined &&
      total_monthly_ttc === undefined
    ) {
      return NextResponse.json(
        { error: 'Fournissez au moins un champ: total_purchase_price_ht, total_ca_marlon_ht ou total_monthly_ttc' },
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

    const updates: Record<string, number> = {};

    if (total_purchase_price_ht !== undefined) {
      const val = parseFloat(total_purchase_price_ht);
      if (isNaN(val) || val < 0) {
        return NextResponse.json({ error: 'Prix d\'achat invalide' }, { status: 400 });
      }
      updates.override_purchase_price_ht = val;
    }
    if (total_ca_marlon_ht !== undefined) {
      const val = parseFloat(total_ca_marlon_ht);
      if (isNaN(val) || val < 0) {
        return NextResponse.json({ error: 'CA Marlon invalide' }, { status: 400 });
      }
      updates.override_ca_marlon_ht = val;
    }
    if (total_monthly_ttc !== undefined) {
      const val = parseFloat(total_monthly_ttc);
      if (isNaN(val) || val < 0) {
        return NextResponse.json({ error: 'Prix mensuel invalide' }, { status: 400 });
      }
      updates.override_monthly_ttc = val;
    }

    const { error } = await serviceClient
      .from('orders')
      .update(updates)
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const changes: string[] = [];
    if (updates.override_purchase_price_ht !== undefined) changes.push(`Prix d'achat → ${updates.override_purchase_price_ht.toFixed(2)} €`);
    if (updates.override_ca_marlon_ht !== undefined) changes.push(`CA Marlon → ${updates.override_ca_marlon_ht.toFixed(2)} €`);
    if (updates.override_monthly_ttc !== undefined) changes.push(`Prix mensuel → ${updates.override_monthly_ttc.toFixed(2)} € TTC`);

    await createOrderLog({
      orderId: params.id,
      actionType: 'updated',
      description: `Résumé modifié (override): ${changes.join(', ')}`,
      metadata: updates,
      userId: user.id,
    });

    const { data: updatedOrder } = await serviceClient
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single();

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
