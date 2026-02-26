import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { slugify } from '@/lib/utils/slug';
import CategoryProductsClient from '../../category/[slug]/CategoryProductsClient';

export async function generateMetadata({
  params,
}: {
  params: { specialtySlug: string; categorySlug: string };
}) {
  const supabase = await createClient();
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', params.categorySlug)
    .single();
  return { title: category?.name ? `Catalogue - ${category.name}` : 'Catalogue' };
}

export default async function CatalogSpecialtyCategoryPage({
  params,
}: {
  params: { specialtySlug: string; categorySlug: string };
}) {
  const supabase = await createClient();

  const { data: specialties } = await supabase.from('specialties').select('id, name');
  const specialty = (specialties || []).find(
    (s: { name?: string }) => slugify(s.name) === params.specialtySlug
  );
  if (!specialty) notFound();

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, product_type')
    .eq('slug', params.categorySlug)
    .eq('product_type', 'medical_equipment')
    .single();
  if (!category) notFound();

  const { data: categorySpecialty } = await supabase
    .from('category_specialties')
    .select('specialty_id')
    .eq('category_id', category.id)
    .eq('specialty_id', specialty.id)
    .single();
  if (!categorySpecialty) notFound();

  const { data: productCategories } = await supabase
    .from('product_categories')
    .select('product_id')
    .eq('category_id', category.id);
  const productIds = productCategories?.map((pc) => pc.product_id) || [];

  const { data: products } = await supabase
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
    .in('id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000'])
    .is('parent_product_id', null)
    .order('name');

  const { data: brands } = await supabase.from('brands').select('id, name').order('name');

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

  const coefficient = allCoefficients?.length ? Number(allCoefficients[0].coefficient) / 100 : 0.035;
  const productMonthlyPrices: Record<string, number> = {};
  for (const product of products || []) {
    const priceHT = Number(product.purchase_price_ht) * (1 + Number(product.marlon_margin_percent) / 100);
    productMonthlyPrices[product.id] = priceHT * findCoefficient(priceHT, product.default_leaser_id);
  }

  return (
    <CategoryProductsClient
      category={category}
      products={products || []}
      brands={brands || []}
      coefficient={coefficient}
      productMonthlyPrices={productMonthlyPrices}
      productType="medical_equipment"
      specialtyId={specialty.id}
      specialtyName={specialty.name}
      hasUrlFilters={true}
      catalogPath={`/catalog/${params.specialtySlug}`}
    />
  );
}
