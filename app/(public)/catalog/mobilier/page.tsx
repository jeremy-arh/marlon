import { Suspense } from 'react';
import CatalogPageContent from '../CatalogPageContent';

export const metadata = { title: 'Catalogue - Mobilier' };

export default function CatalogMobilierPage() {
  return (
    <Suspense fallback={<div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" /></div>}>
      <CatalogPageContent initialFilter={{ type: 'furniture' }} />
    </Suspense>
  );
}
