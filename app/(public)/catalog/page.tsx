import { Suspense } from 'react';
import CatalogPageContent from './CatalogPageContent';
import CatalogSkeleton from './CatalogSkeleton';

export const metadata = { title: 'Catalogue' };

export default function CatalogPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogPageContent />
    </Suspense>
  );
}
