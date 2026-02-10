import { PageSkeleton, GridSkeleton } from '@/components/skeletons/Skeleton';

export default function CatalogLoading() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-10 w-full max-w-md bg-gray-200 rounded animate-pulse" />
      </div>
      <GridSkeleton items={12} cols={3} />
    </div>
  );
}
