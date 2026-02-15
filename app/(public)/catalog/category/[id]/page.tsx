import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CategoryProductsClient from './CategoryProductsClient';

export default async function CategoryPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // Fetch category
  const { data: category } = await supabase
    .from('categories')
    .select('id, name, description, image_url')
    .eq('id', params.id)
    .single();

  if (!category) {
    notFound();
  }

  // Fetch products in this category
  const { data: productCategories } = await supabase
    .from('product_categories')
    .select('product_id')
    .eq('category_id', params.id);

  const productIds = productCategories?.map((pc) => pc.product_id) || [];

  // Only show parent products (not variants) in category listing
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      reference,
      description,
      purchase_price_ht,
      marlon_margin_percent,
      default_leaser_id,
      brand_id,
      product_type,
      brands(id, name),
      product_images(image_url, order_index)
    `)
    .in('id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000'])
    .is('parent_product_id', null)
    .order('name');

  // Get all brands for filter
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name');

  // Load ALL leaser coefficients for price calculations (same as product detail page)
  const { data: allCoefficients } = await supabase
    .from('leaser_coefficients')
    .select('coefficient, min_amount, max_amount')
    .order('coefficient', { ascending: true });

  // Helper: find the best coefficient for a given price HT (divide by 100 since DB stores as percentage)
  const findCoefficient = (priceHT: number): number => {
    if (allCoefficients && allCoefficients.length > 0) {
      const matching = allCoefficients.find(
        (c: any) => Number(c.min_amount) <= priceHT && Number(c.max_amount) >= priceHT
      );
      if (matching) return Number(matching.coefficient) / 100;
      return Number(allCoefficients[0].coefficient) / 100;
    }
    return 0.035;
  };

  // Pre-calculate monthly prices for each product (using correct coefficient per price range)
  const productMonthlyPrices: Record<string, number> = {};
  for (const product of (products || [])) {
    const priceHT = Number(product.purchase_price_ht) * (1 + Number(product.marlon_margin_percent) / 100);
    const coef = findCoefficient(priceHT);
    productMonthlyPrices[product.id] = priceHT * coef;
  }

  // Default coefficient for backward compat (e.g. price filtering)
  const coefficient = allCoefficients && allCoefficients.length > 0
    ? Number(allCoefficients[0].coefficient) / 100
    : 0.035;

  // Determine the most common product type in this category
  const productTypes = (products || []).map((p: any) => p.product_type).filter(Boolean);
  const typeCounts: Record<string, number> = {};
  productTypes.forEach((type: string) => {
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Get specialty name if category has one (for medical equipment)
  let specialtyId: string | null = null;
  let specialtyName: string | null = null;
  if (mostCommonType === 'medical_equipment') {
    const { data: categorySpecialty } = await supabase
      .from('category_specialties')
      .select('specialty_id, specialties(name)')
      .eq('category_id', params.id)
      .limit(1)
      .single();
    
    if (categorySpecialty) {
      specialtyId = categorySpecialty.specialty_id;
      if (categorySpecialty.specialties) {
        specialtyName = (categorySpecialty.specialties as any).name;
      }
    }
  }

  // Get IT type name if category has one (for IT equipment)
  let itTypeId: string | null = null;
  let itTypeName: string | null = null;
  if (mostCommonType === 'it_equipment') {
    const { data: categoryItType } = await supabase
      .from('category_it_types')
      .select('it_type_id, it_equipment_types(name)')
      .eq('category_id', params.id)
      .limit(1)
      .single();
    
    if (categoryItType) {
      itTypeId = categoryItType.it_type_id;
      if (categoryItType.it_equipment_types) {
        itTypeName = (categoryItType.it_equipment_types as any).name;
      }
    }
  }

  return (
    <CategoryProductsClient
      category={category}
      products={products || []}
      brands={brands || []}
      coefficient={Number(coefficient)}
      productMonthlyPrices={productMonthlyPrices}
      productType={mostCommonType}
      specialtyId={specialtyId}
      specialtyName={specialtyName}
      itTypeId={itTypeId}
      itTypeName={itTypeName}
    />
  );
}
