import { createClient } from '@/lib/supabase/server';
import CatalogClient from './CatalogClient';

type InitialFilter =
  | { type: 'furniture' }
  | { type: 'it_equipment'; itCategoryId?: string }
  | { type: 'medical_equipment'; specialtyId?: string }
  | null;

export default async function CatalogPageContent({
  initialFilter = null,
}: {
  initialFilter?: InitialFilter;
}) {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, product_type')
    .order('name');

  const { data: rawSpecialties } = await supabase
    .from('specialties')
    .select('id, name')
    .order('name');
  const specialties = (rawSpecialties || [])
    .filter((s: { name?: string }) => (s.name || '') !== 'Autres')
    .sort((a: { name?: string }, b: { name?: string }) =>
      (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
    );

  const itCategories = (categories || []).filter((c: any) => c.product_type === 'it_equipment');

  const { data: categorySpecialtiesData } = await supabase
    .from('category_specialties')
    .select('category_id, specialty_id');

  const categorySpecialties: Record<string, string[]> = {};
  categorySpecialtiesData?.forEach((cs: any) => {
    if (!categorySpecialties[cs.category_id]) {
      categorySpecialties[cs.category_id] = [];
    }
    categorySpecialties[cs.category_id].push(cs.specialty_id);
  });

  const { data: categoryItTypesData } = await supabase
    .from('category_it_types')
    .select('category_id, it_type_id');

  const categoryItTypes: Record<string, string[]> = {};
  categoryItTypesData?.forEach((ct: any) => {
    if (!categoryItTypes[ct.category_id]) {
      categoryItTypes[ct.category_id] = [];
    }
    categoryItTypes[ct.category_id].push(ct.it_type_id);
  });

  const { data: products } = await supabase
    .from('products')
    .select('id, product_type, product_categories(category_id)');

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
      default_leaser_id,
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

  const allItProducts = itProducts || [];

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
      default_leaser_id,
      brand_id,
      product_type,
      brands(id, name),
      product_images(image_url, order_index)
    `)
    .eq('product_type', 'medical_equipment')
    .is('parent_product_id', null)
    .order('name');

  const { data: furnitureProducts } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
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
    .eq('product_type', 'furniture')
    .is('parent_product_id', null)
    .order('name');

  const { data: allCoefficients } = await supabase
    .from('leaser_coefficients')
    .select('leaser_id, coefficient, min_amount, max_amount')
    .order('coefficient', { ascending: true });

  const findCoefficient = (priceHT: number, leaserId?: string | null): number => {
    if (allCoefficients && allCoefficients.length > 0) {
      const pool = leaserId
        ? allCoefficients.filter((c: any) => c.leaser_id === leaserId)
        : allCoefficients;
      const source = pool.length > 0 ? pool : allCoefficients;
      const matching = source.filter(
        (c: any) => Number(c.min_amount) <= priceHT && Number(c.max_amount) >= priceHT
      );
      if (matching.length > 0) {
        const cheapest = matching.reduce((min: any, c: any) =>
          Number(c.coefficient) < Number(min.coefficient) ? c : min
        );
        return Number(cheapest.coefficient) / 100;
      }
      return Number(source[0].coefficient) / 100;
    }
    return 0.035;
  };

  const coefficient = allCoefficients && allCoefficients.length > 0
    ? Number(allCoefficients[0].coefficient) / 100
    : 0.035;

  const itProductIds = (itProducts || []).map((p: any) => p.id);
  let allChildProducts: any[] = [];
  if (itProductIds.length > 0) {
    const { data: children } = await supabase
      .from('products')
      .select('id, slug, parent_product_id, purchase_price_ht, marlon_margin_percent, default_leaser_id, variant_data, product_images(image_url, order_index)')
      .in('parent_product_id', itProductIds);
    allChildProducts = children || [];
  }

  const productCheapestPrices: Record<string, number> = {};
  const productCheapestImages: Record<string, string | null> = {};
  const productCheapestId: Record<string, string> = {};
  const productCheapestSlug: Record<string, string> = {};

  for (const product of (itProducts || [])) {
    const items: { id: string; slug: string; price: number; image: string | null; variantData: Record<string, string> | null }[] = [];
    const mainHT = Number(product.purchase_price_ht) * (1 + Number(product.marlon_margin_percent) / 100);
    const mainCoef = findCoefficient(mainHT, product.default_leaser_id);
    const mainImage = product.product_images?.length > 0
      ? [...product.product_images].sort((a: any, b: any) => a.order_index - b.order_index)[0].image_url
      : null;
    items.push({ id: product.id, slug: product.slug, price: mainHT * mainCoef, image: mainImage, variantData: product.variant_data || null });

    const children = allChildProducts.filter((c: any) => c.parent_product_id === product.id);
    for (const child of children) {
      if (child.purchase_price_ht && child.marlon_margin_percent) {
        const cHT = Number(child.purchase_price_ht) * (1 + Number(child.marlon_margin_percent) / 100);
        const cCoef = findCoefficient(cHT, child.default_leaser_id || product.default_leaser_id);
        const cImage = child.product_images?.length > 0
          ? [...child.product_images].sort((a: any, b: any) => a.order_index - b.order_index)[0].image_url
          : null;
        items.push({ id: child.id, slug: child.slug, price: cHT * cCoef, image: cImage, variantData: child.variant_data || null });
      }
    }

    if (items.length > 0) {
      items.sort((a, b) => a.price - b.price);
      productCheapestPrices[product.id] = items[0].price;
      productCheapestImages[product.id] = items[0].image;
      productCheapestId[product.id] = items[0].id;
      productCheapestSlug[product.id] = items[0].slug;
    }
  }

  for (const product of (medicalProducts || [])) {
    const priceHT = Number(product.purchase_price_ht) * (1 + Number(product.marlon_margin_percent) / 100);
    const coef = findCoefficient(priceHT, product.default_leaser_id);
    const image = product.product_images?.length > 0
      ? [...product.product_images].sort((a: any, b: any) => a.order_index - b.order_index)[0].image_url
      : null;
    productCheapestPrices[product.id] = priceHT * coef;
    productCheapestImages[product.id] = image;
    productCheapestId[product.id] = product.id;
    productCheapestSlug[product.id] = product.slug;
  }

  for (const product of (furnitureProducts || [])) {
    const priceHT = Number(product.purchase_price_ht) * (1 + Number(product.marlon_margin_percent) / 100);
    const coef = findCoefficient(priceHT, product.default_leaser_id);
    const image = product.product_images?.length > 0
      ? [...product.product_images].sort((a: any, b: any) => a.order_index - b.order_index)[0].image_url
      : null;
    productCheapestPrices[product.id] = priceHT * coef;
    productCheapestImages[product.id] = image;
    productCheapestId[product.id] = product.id;
    productCheapestSlug[product.id] = product.slug;
  }

  return (
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
      allFurnitureProducts={furnitureProducts || []}
      coefficient={coefficient}
      productCheapestPrices={productCheapestPrices}
      productCheapestImages={productCheapestImages}
      productCheapestId={productCheapestId}
      productCheapestSlug={productCheapestSlug}
      initialFilter={initialFilter}
    />
  );
}
