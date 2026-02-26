import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CatalogPageContent from '../CatalogPageContent';
import { slugify } from '@/lib/utils/slug';

export async function generateMetadata({ params }: { params: { specialtySlug: string } }) {
  const supabase = await createClient();
  const { data: specialties } = await supabase.from('specialties').select('id, name');
  const specialty = (specialties || []).find(
    (s: { name?: string }) => slugify(s.name) === params.specialtySlug
  );
  return { title: specialty?.name ? `Catalogue - ${specialty.name}` : 'Catalogue' };
}

export default async function CatalogSpecialtyPage({
  params,
}: {
  params: { specialtySlug: string };
}) {
  const supabase = await createClient();
  const { data: specialties } = await supabase.from('specialties').select('id, name');
  const specialty = (specialties || []).find(
    (s: { name?: string }) => slugify(s.name) === params.specialtySlug
  );

  if (!specialty) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" /></div>}>
      <CatalogPageContent initialFilter={{ type: 'medical_equipment', specialtyId: specialty.id }} />
    </Suspense>
  );
}
