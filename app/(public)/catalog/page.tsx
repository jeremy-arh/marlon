import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import CatalogClient from './CatalogClient';

export default async function CatalogPage() {
  const supabase = await createClient();

  // Fetch all categories with images
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, description, image_url')
    .order('name');

  // Fetch all specialties
  const { data: specialties } = await supabase
    .from('specialties')
    .select('id, name')
    .order('name');

  // Fetch all IT equipment types
  const { data: itTypes } = await supabase
    .from('it_equipment_types')
    .select('id, name')
    .order('name');

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

  return (
    <Suspense fallback={<div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" /></div>}>
      <CatalogClient 
        initialCategories={categories || []} 
        categoryProductTypes={categoryProductTypes}
        categorySpecialties={categorySpecialties}
        categoryItTypes={categoryItTypes}
        specialties={specialties || []}
        itTypes={itTypes || []}
      />
    </Suspense>
  );
}
