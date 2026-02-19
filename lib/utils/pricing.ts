import { createClient } from '@/lib/supabase/server';

export interface PriceCalculation {
  monthlyPrice: number;
  totalPrice: number;
  coefficient: number;
  sellingPrice: number;
}

/**
 * Calculate selling price from purchase price and margin
 */
export function calculateSellingPrice(
  purchasePrice: number,
  marginPercent: number
): number {
  return purchasePrice * (1 + marginPercent / 100);
}

/**
 * Get coefficient for a specific leaser, amount range, and duration
 */
export async function getLeaserCoefficient(
  leaserId: string,
  amount: number,
  durationMonths: number
): Promise<number | null> {
  const supabase = await createClient();

  const { data: duration } = await supabase
    .from('leasing_durations')
    .select('id')
    .eq('months', durationMonths)
    .single();

  if (!duration) {
    return null;
  }

  const { data, error } = await supabase
    .from('leaser_coefficients')
    .select('coefficient')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .gte('max_amount', amount)
    .lte('min_amount', amount)
    .single();

  if (error || !data) {
    return null;
  }

  return parseFloat(data.coefficient.toString());
}

/**
 * Get coefficient for a specific tranche (min/max amount range)
 */
export async function getLeaserCoefficientByTranche(
  leaserId: string,
  minAmount: number,
  maxAmount: number,
  durationMonths: number
): Promise<number | null> {
  const supabase = await createClient();

  const { data: duration } = await supabase
    .from('leasing_durations')
    .select('id')
    .eq('months', durationMonths)
    .single();

  if (!duration) {
    return null;
  }

  const { data, error } = await supabase
    .from('leaser_coefficients')
    .select('coefficient')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .eq('min_amount', minAmount)
    .eq('max_amount', maxAmount)
    .single();

  if (error || !data) {
    return null;
  }

  return parseFloat(data.coefficient.toString());
}

/**
 * Calculate monthly price and total price for a product
 */
export async function calculateProductPrice(
  purchasePrice: number,
  marginPercent: number,
  leaserId: string,
  durationMonths: number,
  amountRange?: { min: number; max: number }
): Promise<PriceCalculation | null> {
  const sellingPrice = calculateSellingPrice(purchasePrice, marginPercent);

  let coefficient: number | null;

  if (amountRange) {
    coefficient = await getLeaserCoefficientByTranche(
      leaserId,
      amountRange.min,
      amountRange.max,
      durationMonths
    );
  } else {
    coefficient = await getLeaserCoefficient(
      leaserId,
      sellingPrice,
      durationMonths
    );
  }

  if (!coefficient) {
    return null;
  }

  const monthlyPrice = (sellingPrice * coefficient) / 100;
  const totalPrice = monthlyPrice * durationMonths;

  return {
    monthlyPrice,
    totalPrice,
    coefficient,
    sellingPrice,
  };
}

/**
 * Find the tranche (amount range) for a given total amount
 */
export async function findTrancheForAmount(
  leaserId: string,
  totalAmount: number,
  durationMonths: number
): Promise<{ min: number; max: number } | null> {
  const supabase = await createClient();

  const { data: duration } = await supabase
    .from('leasing_durations')
    .select('id')
    .eq('months', durationMonths)
    .single();

  if (!duration) {
    return null;
  }

  const { data, error } = await supabase
    .from('leaser_coefficients')
    .select('min_amount, max_amount')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .gte('max_amount', totalAmount)
    .lte('min_amount', totalAmount)
    .order('min_amount', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    min: parseFloat(data.min_amount.toString()),
    max: parseFloat(data.max_amount.toString()),
  };
}

// Default coefficients by duration (in percentage) - used as fallback
const DEFAULT_COEFFICIENTS: Record<number, number> = {
  24: 5.0,
  36: 3.8,
  48: 3.2,
  60: 2.8,
};

function getDefaultCoefficient(durationMonths: number): number {
  return DEFAULT_COEFFICIENTS[durationMonths] || 3.5;
}

/**
 * Recalculate all product prices based on total order amount
 * Uses the total amount's tranche, not individual product amounts
 */
export async function recalculateOrderPrices(
  orderItems: Array<{
    productId: string;
    purchasePrice: number;
    marginPercent: number;
    quantity: number;
  }>,
  totalAmount: number,
  leaserId: string,
  durationMonths: number
): Promise<Array<{
  productId: string;
  purchasePrice: number;
  marginPercent: number;
  quantity: number;
  calculatedPrice: number;
  coefficient: number;
}>> {
  const tranche = await findTrancheForAmount(leaserId, totalAmount, durationMonths);

  let coefficientValue: number | null = null;
  
  if (tranche) {
    coefficientValue = await getLeaserCoefficientByTranche(
      leaserId,
      tranche.min,
      tranche.max,
      durationMonths
    );
  }
  
  const finalCoefficient = coefficientValue ?? getDefaultCoefficient(durationMonths);

  const recalculatedItems = orderItems.map((item) => {
    const sellingPrice = calculateSellingPrice(
      item.purchasePrice,
      item.marginPercent
    );

    const monthlyPrice = (sellingPrice * finalCoefficient) / 100;
    const calculatedPrice = monthlyPrice * durationMonths * item.quantity;

    return {
      ...item,
      calculatedPrice,
      coefficient: finalCoefficient,
    };
  });

  return recalculatedItems;
}
