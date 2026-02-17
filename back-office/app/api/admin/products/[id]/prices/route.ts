import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { calculateProductPriceServer } from '@/lib/utils/pricing-server';

export async function GET(
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

    const { data: product } = await serviceClient
      .from('products')
      .select('purchase_price_ht, marlon_margin_percent, default_leaser_id')
      .eq('id', params.id)
      .single();

    if (!product || !product.default_leaser_id) {
      return NextResponse.json({ success: true, data: {} });
    }

    const { data: durations } = await serviceClient
      .from('leasing_durations')
      .select('months')
      .order('months', { ascending: true });

    const pricesByDuration: Record<number, { monthly: number; total: number }> = {};
    if (durations) {
      for (const d of durations) {
        const calc = await calculateProductPriceServer(
          parseFloat(product.purchase_price_ht?.toString() || '0'),
          parseFloat(product.marlon_margin_percent?.toString() || '0'),
          product.default_leaser_id,
          d.months
        );
        if (calc) {
          pricesByDuration[d.months] = {
            monthly: calc.monthlyPrice,
            total: calc.totalPrice,
          };
        }
      }
    }

    return NextResponse.json({ success: true, data: pricesByDuration });
  } catch (error: any) {
    console.error('Error fetching product prices:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur' },
      { status: 500 }
    );
  }
}
