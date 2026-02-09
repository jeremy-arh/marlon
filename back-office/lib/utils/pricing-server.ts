import { createServiceClient } from '@/lib/supabase/service';

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
 * Get coefficient for a specific leaser, amount, and duration (server-side)
 */
export async function getLeaserCoefficientServer(
  leaserId: string,
  amount: number,
  durationMonths: number
): Promise<number | null> {
  const serviceClient = createServiceClient();

  // First get the duration ID from months
  const { data: duration } = await serviceClient
    .from('leasing_durations')
    .select('id')
    .eq('months', durationMonths)
    .single();

  if (!duration) {
    return null;
  }

  // Find the coefficient that matches the amount range
  // We need to find where amount >= min_amount AND (amount <= max_amount OR max_amount IS NULL)
  // Try to find bounded ranges first
  const { data: boundedData } = await serviceClient
    .from('leaser_coefficients')
    .select('coefficient')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .lte('min_amount', amount)
    .gte('max_amount', amount)
    .order('min_amount', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (boundedData) {
    return parseFloat(boundedData.coefficient.toString());
  }

  // If no bounded range found, try to find one with NULL max_amount (unbounded)
  const { data: unboundedData } = await serviceClient
    .from('leaser_coefficients')
    .select('coefficient')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .is('max_amount', null)
    .lte('min_amount', amount)
    .order('min_amount', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (unboundedData) {
    return parseFloat(unboundedData.coefficient.toString());
  }

  return null;
}

/**
 * Calculate monthly price and total price for a product (server-side)
 */
export async function calculateProductPriceServer(
  purchasePrice: number,
  marginPercent: number,
  leaserId: string | null,
  durationMonths: number
): Promise<PriceCalculation | null> {
  if (!leaserId) {
    return null;
  }

  const sellingPrice = calculateSellingPrice(purchasePrice, marginPercent);
  const coefficient = await getLeaserCoefficientServer(
    leaserId,
    sellingPrice,
    durationMonths
  );

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
 * Get coefficient for a specific tranche (min/max amount range) - server-side
 */
export async function getLeaserCoefficientByTrancheServer(
  leaserId: string,
  minAmount: number,
  maxAmount: number | null,
  durationMonths: number
): Promise<number | null> {
  const serviceClient = createServiceClient();

  // First get the duration ID from months
  const { data: duration } = await serviceClient
    .from('leasing_durations')
    .select('id')
    .eq('months', durationMonths)
    .single();

  if (!duration) {
    return null;
  }

  // If maxAmount is Infinity or null, search for unbounded range
  if (maxAmount === null || maxAmount === Infinity) {
    const { data, error } = await serviceClient
      .from('leaser_coefficients')
      .select('coefficient')
      .eq('leaser_id', leaserId)
      .eq('duration_id', duration.id)
      .eq('min_amount', minAmount)
      .is('max_amount', null)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return parseFloat(data.coefficient.toString());
  }

  // For bounded ranges, find exact match
  const { data, error } = await serviceClient
    .from('leaser_coefficients')
    .select('coefficient')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .eq('min_amount', minAmount)
    .eq('max_amount', maxAmount)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return parseFloat(data.coefficient.toString());
}

/**
 * Find the tranche (amount range) for a given total amount - server-side
 */
export async function findTrancheForAmountServer(
  leaserId: string,
  totalAmount: number,
  durationMonths: number
): Promise<{ min: number; max: number } | null> {
  const serviceClient = createServiceClient();

  // First get the duration ID from months
  const { data: duration } = await serviceClient
    .from('leasing_durations')
    .select('id')
    .eq('months', durationMonths)
    .single();

  if (!duration) {
    return null;
  }

  // Try to find bounded ranges first (where totalAmount >= min_amount AND totalAmount <= max_amount)
  const { data: boundedData, error: boundedError } = await serviceClient
    .from('leaser_coefficients')
    .select('min_amount, max_amount')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .lte('min_amount', totalAmount)
    .not('max_amount', 'is', null)
    .gte('max_amount', totalAmount)
    .order('min_amount', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (boundedData && !boundedError) {
    return {
      min: parseFloat(boundedData.min_amount.toString()),
      max: parseFloat(boundedData.max_amount.toString()),
    };
  }

  // If no bounded range found, try to find one with NULL max_amount (unbounded)
  const { data: unboundedData, error: unboundedError } = await serviceClient
    .from('leaser_coefficients')
    .select('min_amount, max_amount')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .is('max_amount', null)
    .lte('min_amount', totalAmount)
    .order('min_amount', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (unboundedData && !unboundedError) {
    return {
      min: parseFloat(unboundedData.min_amount.toString()),
      max: parseFloat(unboundedData.max_amount.toString()) || Infinity,
    };
  }

  return null;
}

/**
 * Find the coefficient for a given total amount - server-side
 * Returns the coefficient directly from the matching tranche
 */
export async function findCoefficientForAmountServer(
  leaserId: string,
  totalAmount: number,
  durationMonths: number
): Promise<number | null> {
  const serviceClient = createServiceClient();

  // First get the duration ID from months
  const { data: duration } = await serviceClient
    .from('leasing_durations')
    .select('id')
    .eq('months', durationMonths)
    .single();

  if (!duration) {
    return null;
  }

  // Try to find bounded ranges first (where totalAmount >= min_amount AND totalAmount <= max_amount)
  const { data: boundedData, error: boundedError } = await serviceClient
    .from('leaser_coefficients')
    .select('coefficient')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .lte('min_amount', totalAmount)
    .not('max_amount', 'is', null)
    .gte('max_amount', totalAmount)
    .order('min_amount', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (boundedData && !boundedError) {
    return parseFloat(boundedData.coefficient.toString());
  }

  // If no bounded range found, try to find one with NULL max_amount (unbounded)
  const { data: unboundedData, error: unboundedError } = await serviceClient
    .from('leaser_coefficients')
    .select('coefficient')
    .eq('leaser_id', leaserId)
    .eq('duration_id', duration.id)
    .is('max_amount', null)
    .lte('min_amount', totalAmount)
    .order('min_amount', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (unboundedData && !unboundedError) {
    return parseFloat(unboundedData.coefficient.toString());
  }

  return null;
}

/**
 * Recalculate all product prices based on total order amount - server-side
 * This is used when submitting an order - all prices are recalculated
 * based on the total amount's tranche, not individual product amounts
 * All products use the SAME coefficient based on the total order amount
 */
export async function recalculateOrderPricesServer(
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
}> | null> {
  // Find coefficient for total amount - this will be the SAME for all products
  const coefficient = await findCoefficientForAmountServer(leaserId, totalAmount, durationMonths);

  if (!coefficient) {
    return null;
  }

  // Apply the SAME coefficient to all products
  const recalculatedItems = orderItems.map((item) => {
    const sellingPrice = calculateSellingPrice(
      item.purchasePrice,
      item.marginPercent
    );

    const monthlyPrice = (sellingPrice * coefficient) / 100;
    const calculatedPrice = monthlyPrice * durationMonths * item.quantity;

    return {
      ...item,
      calculatedPrice,
      coefficient, // Same coefficient for all products
    };
  });

  return recalculatedItems;
}