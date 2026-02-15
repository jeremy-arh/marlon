import { GridSkeleton } from '@/components/skeletons/Skeleton';

export default function CategoryLoading() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-96 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-10 w-full max-w-md bg-gray-200 rounded animate-pulse" />
      </div>
      <GridSkeleton items={12} cols={3} />
    </div>
  );
}
