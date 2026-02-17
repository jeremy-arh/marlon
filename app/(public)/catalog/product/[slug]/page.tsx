import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

async function getProduct(slug: string) {
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
    .eq('slug', slug)
    .single();

  return product;
}

async function getProductCategory(productId: string) {
  const supabase = await createClient();

  const { data: productCategory } = await supabase
    .from('product_categories')
    .select('category_id, categories(id, name, slug)')
    .eq('product_id', productId)
    .limit(1)
    .single();

  return productCategory;
}

async function getRelatedProducts(categoryId: string, currentProductId: string, groupProductIds: string[]) {
  const supabase = await createClient();

  // Get product IDs in the same category, excluding current product and all its group members
  const excludeIds = [currentProductId, ...groupProductIds];
  
  const { data: productCategories } = await supabase
    .from('product_categories')
    .select('product_id')
    .eq('category_id', categoryId)
    .not('product_id', 'in', `(${excludeIds.join(',')})`)
    .limit(10);

  if (!productCategories || productCategories.length === 0) {
    return [];
  }

  const productIds = productCategories.map((pc) => pc.product_id);

  // Only show parent products (not variants) in related products
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      purchase_price_ht,
      marlon_margin_percent,
      product_images(image_url, order_index)
    `)
    .in('id', productIds)
    .is('parent_product_id', null)
    .limit(5);

  return products || [];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);

  if (!product) {
    return {
      title: 'Produit non trouvé',
    };
  }

  return {
    title: product.name,
    description: product.description || `Découvrez ${product.name} sur MARLON`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createClient();
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

  // Determine the parent product ID and fetch all group members (siblings)
  const parentId = product.parent_product_id || product.id;
  
  // Fetch all products in the group: parent + all children
  const { data: groupProducts } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      purchase_price_ht,
      marlon_margin_percent,
      variant_data,
      parent_product_id,
      product_images(image_url, order_index)
    `)
    .or(`id.eq.${parentId},parent_product_id.eq.${parentId}`)
    .order('created_at', { ascending: true });

  const siblings = groupProducts || [];
  const groupProductIds = siblings.map(p => p.id);

  // Get category for breadcrumb and related products
  // If current product is a variant, use parent's category
  const categoryProductId = product.parent_product_id || product.id;
  const productCategory = await getProductCategory(categoryProductId);
  const category = productCategory?.categories as { id: string; name: string; slug: string } | null;

  // Get related products (excluding all group members)
  const relatedProducts = category ? await getRelatedProducts(category.id, product.id, groupProductIds) : [];

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

  // For IT products: use category id for breadcrumb link (dropdown now shows categories)
  const itCategoryId = category && productType === 'it_equipment' ? category.id : null;

  // Load ALL leaser coefficients once for price calculations
  const { data: allCoefficients } = await supabase
    .from('leaser_coefficients')
    .select('coefficient, min_amount, max_amount, duration_id, leasing_durations(months)')
    .order('coefficient', { ascending: true });

  // Helper: find the best coefficient for a given price HT
  const findCoefficient = (priceHT: number): number => {
    if (allCoefficients && allCoefficients.length > 0) {
      const matching = allCoefficients.find(
        (c: any) => Number(c.min_amount) <= priceHT && Number(c.max_amount) >= priceHT
      );
      if (matching) return Number(matching.coefficient) / 100;
      return Number(allCoefficients[0].coefficient) / 100;
    }
    return 0.05;
  };

  // Calculate the current product's price
  const productPriceHT = product.purchase_price_ht * (1 + product.marlon_margin_percent / 100);
  const coefficient = findCoefficient(Number(productPriceHT));
  const currentMonthlyPrice = Number(productPriceHT) * coefficient;

  // Get the best duration
  let bestDurationMonths = 60;
  if (allCoefficients && allCoefficients.length > 0) {
    const matching = allCoefficients.find(
      (c: any) => Number(c.min_amount) <= Number(productPriceHT) && Number(c.max_amount) >= Number(productPriceHT)
    );
    if (matching) {
      bestDurationMonths = (matching.leasing_durations as any)?.months || 60;
    } else {
      bestDurationMonths = (allCoefficients[0].leasing_durations as any)?.months || 60;
    }
  }

  // Calculate cheapest price across all group members (for "à partir de")
  let cheapestMonthlyPrice: number | null = null;
  if (productType === 'it_equipment' && siblings.length > 1) {
    const allPrices: number[] = [];
    for (const s of siblings) {
      if (s.purchase_price_ht && s.marlon_margin_percent) {
        const sHT = Number(s.purchase_price_ht) * (1 + Number(s.marlon_margin_percent) / 100);
        allPrices.push(sHT * findCoefficient(sHT));
      }
    }
    if (allPrices.length > 0) {
      cheapestMonthlyPrice = Math.min(...allPrices);
    }
  }

  // Fetch variant filter definitions (for building filter dropdowns)
  let variantFilterDefs: any[] = [];
  if (productType === 'it_equipment' && siblings.length > 1) {
    // Get variant filter IDs from the parent product
    const { data: filterJunctions } = await supabase
      .from('product_variant_filters_junction')
      .select('filter_id')
      .eq('product_id', parentId);

    if (filterJunctions && filterJunctions.length > 0) {
      const filterIds = filterJunctions.map(fj => fj.filter_id);
      const { data: filters } = await supabase
        .from('product_variant_filters')
        .select('id, name, label, product_variant_filter_options(id, value, label, order_index)')
        .in('id', filterIds);
      variantFilterDefs = filters || [];
    }
  }

  return (
    <ProductDetailClient
      product={product}
      category={category}
      productType={productType}
      specialtyId={specialtyId}
      specialtyName={specialtyName}
      itCategoryId={itCategoryId}
      coefficient={Number(coefficient)}
      currentMonthlyPrice={currentMonthlyPrice}
      cheapestMonthlyPrice={cheapestMonthlyPrice}
      bestDurationMonths={bestDurationMonths}
      relatedProducts={relatedProducts}
      siblings={siblings}
      variantFilterDefs={variantFilterDefs}
    />
  );
}
