import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CatalogPageContent from '../../CatalogPageContent';
import CatalogSkeleton from '../../CatalogSkeleton';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', params.slug)
    .eq('product_type', 'it_equipment')
    .single();
  return { title: category?.name ? `Catalogue - ${category.name}` : 'Catalogue - Informatique' };
}

export default async function CatalogInformatiqueCategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = await createClient();
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', params.slug)
    .eq('product_type', 'it_equipment')
    .single();

  if (!category) {
    notFound();
  }

  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogPageContent initialFilter={{ type: 'it_equipment', itCategoryId: category.id }} />
    </Suspense>
  );
}
