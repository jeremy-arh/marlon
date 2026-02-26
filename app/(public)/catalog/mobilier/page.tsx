import { Suspense } from 'react';
import CatalogPageContent from '../CatalogPageContent';
import CatalogSkeleton from '../CatalogSkeleton';

export const metadata = { title: 'Catalogue - Mobilier' };

export default function CatalogMobilierPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogPageContent initialFilter={{ type: 'furniture' }} />
    </Suspense>
  );
}
