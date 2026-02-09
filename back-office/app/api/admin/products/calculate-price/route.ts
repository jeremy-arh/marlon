import { NextRequest, NextResponse } from 'next/server';
import { calculateProductPriceServer } from '@/lib/utils/pricing-server';

export const revalidate = 0;

// POST calculate product price
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { purchase_price_ht, marlon_margin_percent, leaser_id, duration_months } = body;

    if (!purchase_price_ht || !marlon_margin_percent || !leaser_id || !duration_months) {
      return NextResponse.json(
        { error: 'Tous les paramètres sont requis' },
        { status: 400 }
      );
    }

    const result = await calculateProductPriceServer(
      parseFloat(purchase_price_ht),
      parseFloat(marlon_margin_percent),
      leaser_id,
      parseInt(duration_months)
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Impossible de calculer le prix. Vérifiez les coefficients du leaser.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        monthlyPrice: result.monthlyPrice,
        totalPrice: result.totalPrice,
        coefficient: result.coefficient,
        sellingPrice: result.sellingPrice,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
