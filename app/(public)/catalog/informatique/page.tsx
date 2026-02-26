import { Suspense } from 'react';
import CatalogPageContent from '../CatalogPageContent';
import CatalogSkeleton from '../CatalogSkeleton';

export const metadata = { title: 'Catalogue - Informatique' };

export default function CatalogInformatiquePage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogPageContent initialFilter={{ type: 'it_equipment' }} />
    </Suspense>
  );
}
