import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

async function getProduct(id: string) {
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      product_images(image_url, order_index),
      brands(name),
      suppliers(name),
      default_leaser:leasers(id, name)
    `)
    .eq('id', id)
    .single();

  return product;
}

async function getProductCategory(productId: string) {
  const supabase = await createClient();

  const { data: productCategory } = await supabase
    .from('product_categories')
    .select('category_id, categories(id, name)')
    .eq('product_id', productId)
    .limit(1)
    .single();

  return productCategory;
}

async function getRelatedProducts(categoryId: string, currentProductId: string) {
  const supabase = await createClient();

  // Get product IDs in the same category
  const { data: productCategories } = await supabase
    .from('product_categories')
    .select('product_id')
    .eq('category_id', categoryId)
    .neq('product_id', currentProductId)
    .limit(10);

  if (!productCategories || productCategories.length === 0) {
    return [];
  }

  const productIds = productCategories.map((pc) => pc.product_id);

  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      purchase_price_ht,
      marlon_margin_percent,
      product_images(image_url, order_index)
    `)
    .in('id', productIds)
    .limit(5);

  return products || [];
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const product = await getProduct(params.id);

  if (!product) {
    return {
      title: 'Produit non trouvé',
    };
  }

  return {
    title: `${product.name} - MARLON`,
    description: product.description || `Découvrez ${product.name} sur MARLON`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  // Get category for breadcrumb and related products
  const productCategory = await getProductCategory(params.id);
  const category = productCategory?.categories as { id: string; name: string } | null;

  // Get related products
  const relatedProducts = category ? await getRelatedProducts(category.id, params.id) : [];

  // Get product type and specialty for breadcrumb
  let productType = product.product_type || null;
  let specialtyId: string | null = null;
  let specialtyName: string | null = null;

  if (category && productType === 'medical_equipment') {
    const { data: categorySpecialty } = await supabase
      .from('category_specialties')
      .select('specialty_id, specialties(name)')
      .eq('category_id', category.id)
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
  if (category && productType === 'it_equipment') {
    const { data: categoryItType } = await supabase
      .from('category_it_types')
      .select('it_type_id, it_equipment_types(name)')
      .eq('category_id', category.id)
      .limit(1)
      .single();

    if (categoryItType) {
      itTypeId = categoryItType.it_type_id;
      if (categoryItType.it_equipment_types) {
        itTypeName = (categoryItType.it_equipment_types as any).name;
      }
    }
  }

  // Get all leasing durations
  const { data: durations } = await supabase
    .from('leasing_durations')
    .select('id, months')
    .order('months', { ascending: true });

  // Calculate the product price with margin
  const productPriceHT = product.purchase_price_ht * (1 + product.marlon_margin_percent / 100);

  // Get the coefficient for the longest duration that gives the lowest monthly price
  // First, find the longest duration that has coefficients
  const { data: coefficientsWithDurations } = await supabase
    .from('leaser_coefficients')
    .select('coefficient, min_amount, max_amount, duration_id, leasing_durations(months)')
    .gte('max_amount', productPriceHT)
    .lte('min_amount', productPriceHT)
    .order('coefficient', { ascending: true }) // Lower coefficient = lower monthly payment
    .limit(1);

  // Fallback: get any coefficient that matches the price range
  let coefficient = 0.035;
  let bestDurationMonths = 60;
  
  if (coefficientsWithDurations && coefficientsWithDurations.length > 0) {
    coefficient = Number(coefficientsWithDurations[0].coefficient) / 100; // Convert percentage to decimal
    bestDurationMonths = (coefficientsWithDurations[0].leasing_durations as any)?.months || 60;
  } else {
    // Fallback: get the lowest coefficient available
    const { data: fallbackCoef } = await supabase
      .from('leaser_coefficients')
      .select('coefficient, leasing_durations(months)')
      .order('coefficient', { ascending: true })
      .limit(1)
      .single();
    
    if (fallbackCoef) {
      coefficient = Number(fallbackCoef.coefficient) / 100;
      bestDurationMonths = (fallbackCoef.leasing_durations as any)?.months || 60;
    }
  }

  return (
    <ProductDetailClient
      product={product}
      category={category}
      productType={productType}
      specialtyId={specialtyId}
      specialtyName={specialtyName}
      itTypeId={itTypeId}
      itTypeName={itTypeName}
      coefficient={Number(coefficient)}
      bestDurationMonths={bestDurationMonths}
      relatedProducts={relatedProducts}
    />
  );
}
