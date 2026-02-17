import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import CatalogClient from './CatalogClient';

export const metadata = { title: 'Catalogue' };

export default async function CatalogPage() {
  const supabase = await createClient();

  // Fetch all categories with images and product_type
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, product_type')
    .order('name');

  // Fetch all specialties (tri alphabétique, "Autres" masqué dans l'app)
  const { data: rawSpecialties } = await supabase
    .from('specialties')
    .select('id, name')
    .order('name');
  const specialties = (rawSpecialties || [])
    .filter((s: { name?: string }) => (s.name || '') !== 'Autres')
    .sort((a: { name?: string }, b: { name?: string }) =>
      (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
    );

  // IT categories (categories with product_type = it_equipment) for the Informatique dropdown
  const itCategories = (categories || []).filter((c: any) => c.product_type === 'it_equipment');

  // Fetch category-specialty mappings
  const { data: categorySpecialtiesData } = await supabase
    .from('category_specialties')
    .select('category_id, specialty_id');

  // Build category -> specialties map
  const categorySpecialties: Record<string, string[]> = {};
  categorySpecialtiesData?.forEach((cs: any) => {
    if (!categorySpecialties[cs.category_id]) {
      categorySpecialties[cs.category_id] = [];
    }
    categorySpecialties[cs.category_id].push(cs.specialty_id);
  });

  // Fetch category-IT type mappings
  const { data: categoryItTypesData } = await supabase
    .from('category_it_types')
    .select('category_id, it_type_id');

  // Build category -> IT types map
  const categoryItTypes: Record<string, string[]> = {};
  categoryItTypesData?.forEach((ct: any) => {
    if (!categoryItTypes[ct.category_id]) {
      categoryItTypes[ct.category_id] = [];
    }
    categoryItTypes[ct.category_id].push(ct.it_type_id);
  });

  // Fetch products with their types to determine which categories belong to which product type
  const { data: products } = await supabase
    .from('products')
    .select('id, product_type, product_categories(category_id)');

  // Build category -> product_types map
  const categoryProductTypes: Record<string, string[]> = {};
  products?.forEach((product: any) => {
    if (product.product_type && product.product_categories) {
      product.product_categories.forEach((pc: any) => {
        if (!categoryProductTypes[pc.category_id]) {
          categoryProductTypes[pc.category_id] = [];
        }
        if (!categoryProductTypes[pc.category_id].includes(product.product_type)) {
          categoryProductTypes[pc.category_id].push(product.product_type);
        }
      });
    }
  });

  // Fetch IT equipment products with full details for direct display
  // Only parent products (parent_product_id IS NULL) — variants are child products
  const { data: itProducts } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      reference,
      description,
      purchase_price_ht,
      marlon_margin_percent,
      brand_id,
      product_type,
      variant_data,
      brands(id, name),
      product_images(image_url, order_index),
      product_categories(category_id)
    `)
    .eq('product_type', 'it_equipment')
    .is('parent_product_id', null)
    .order('name');

  // Build category_id -> products map for IT categories (products linked via product_categories)
  const itCategoryProducts: Record<string, any[]> = {};
  itProducts?.forEach((product: any) => {
    const productCategoryIds = (product.product_categories || []).map((pc: any) => pc.category_id);
    productCategoryIds.forEach((catId: string) => {
      if (!itCategoryProducts[catId]) {
        itCategoryProducts[catId] = [];
      }
      if (!itCategoryProducts[catId].find((p: any) => p.id === product.id)) {
        itCategoryProducts[catId].push(product);
      }
    });
  });

  // Also create "all" IT products list (for when "Tous les équipements IT" is selected)
  const allItProducts = itProducts || [];

  // Fetch all medical equipment products for search
  const { data: medicalProducts } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      reference,
      description,
      purchase_price_ht,
      marlon_margin_percent,
      brand_id,
      product_type,
      brands(id, name),
      product_images(image_url, order_index)
    `)
    .eq('product_type', 'medical_equipment')
    .is('parent_product_id', null)
    .order('name');

  // Get all leaser coefficients for price calculations
  const { data: allCoefficients } = await supabase
    .from('leaser_coefficients')
    .select('coefficient, min_amount, max_amount')
    .order('coefficient', { ascending: true });

  // Helper: find the best coefficient for a given price HT
  const findCoefficient = (priceHT: number): number => {
    if (allCoefficients && allCoefficients.length > 0) {
      const matching = allCoefficients.find(
        (c: any) => Number(c.min_amount) <= priceHT && Number(c.max_amount) >= priceHT
      );
      if (matching) return Number(matching.coefficient) / 100;
      // Fallback: lowest coefficient
      return Number(allCoefficients[0].coefficient) / 100;
    }
    return 0.035;
  };

  // Default coefficient for backward compat
  const coefficient = allCoefficients && allCoefficients.length > 0
    ? Number(allCoefficients[0].coefficient) / 100
    : 0.035;

  // Fetch ALL child products (variants) for IT parent products to compute cheapest price
  const itProductIds = (itProducts || []).map((p: any) => p.id);
  let allChildProducts: any[] = [];
  if (itProductIds.length > 0) {
    const { data: children } = await supabase
      .from('products')
      .select('id, slug, parent_product_id, purchase_price_ht, marlon_margin_percent, variant_data, product_images(image_url, order_index)')
      .in('parent_product_id', itProductIds);
    allChildProducts = children || [];
  }

  // Build maps: product_id -> { cheapestPrice, cheapestImage, cheapestVariantData, cheapestProductId }
  const productCheapestPrices: Record<string, number> = {};
  const productCheapestImages: Record<string, string | null> = {};
  const productCheapestVariantData: Record<string, Record<string, string>> = {};
  const productCheapestId: Record<string, string> = {};
  const productCheapestSlug: Record<string, string> = {};
  for (const product of (itProducts || [])) {
    const items: { id: string; slug: string; price: number; image: string | null; variantData: Record<string, string> | null }[] = [];
    
    // Main product price
    const mainHT = Number(product.purchase_price_ht) * (1 + Number(product.marlon_margin_percent) / 100);
    const mainCoef = findCoefficient(mainHT);
    const mainImage = product.product_images?.length > 0
      ? [...product.product_images].sort((a: any, b: any) => a.order_index - b.order_index)[0].image_url
      : null;
    items.push({ id: product.id, slug: product.slug, price: mainHT * mainCoef, image: mainImage, variantData: product.variant_data || null });

    // Child products prices
    const children = allChildProducts.filter((c: any) => c.parent_product_id === product.id);
    for (const child of children) {
      if (child.purchase_price_ht && child.marlon_margin_percent) {
        const cHT = Number(child.purchase_price_ht) * (1 + Number(child.marlon_margin_percent) / 100);
        const cCoef = findCoefficient(cHT);
        const cImage = child.product_images?.length > 0
          ? [...child.product_images].sort((a: any, b: any) => a.order_index - b.order_index)[0].image_url
          : null;
        items.push({ id: child.id, slug: child.slug, price: cHT * cCoef, image: cImage, variantData: child.variant_data || null });
      }
    }

    if (items.length > 0) {
      // Sort by price ascending to find cheapest
      items.sort((a, b) => a.price - b.price);
      productCheapestPrices[product.id] = items[0].price;
      productCheapestImages[product.id] = items[0].image;
      productCheapestId[product.id] = items[0].id;
      productCheapestSlug[product.id] = items[0].slug;
      if (items[0].variantData) {
        productCheapestVariantData[product.id] = items[0].variantData;
      }
    }
  }

  // Calculate prices for medical products
  for (const product of (medicalProducts || [])) {
    const priceHT = Number(product.purchase_price_ht) * (1 + Number(product.marlon_margin_percent) / 100);
    const coef = findCoefficient(priceHT);
    const monthlyPrice = priceHT * coef;
    const image = product.product_images?.length > 0
      ? [...product.product_images].sort((a: any, b: any) => a.order_index - b.order_index)[0].image_url
      : null;
    
    productCheapestPrices[product.id] = monthlyPrice;
    productCheapestImages[product.id] = image;
    productCheapestId[product.id] = product.id;
    productCheapestSlug[product.id] = product.slug;
  }

  return (
    <Suspense fallback={<div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" /></div>}>
      <CatalogClient 
        initialCategories={categories || []} 
        categoryProductTypes={categoryProductTypes}
        categorySpecialties={categorySpecialties}
        categoryItTypes={categoryItTypes}
        specialties={specialties || []}
        itCategories={itCategories}
        itCategoryProducts={itCategoryProducts}
        allItProducts={allItProducts}
        allMedicalProducts={medicalProducts || []}
        coefficient={coefficient}
        productCheapestPrices={productCheapestPrices}
        productCheapestImages={productCheapestImages}
        productCheapestId={productCheapestId}
        productCheapestSlug={productCheapestSlug}
      />
    </Suspense>
  );
}
