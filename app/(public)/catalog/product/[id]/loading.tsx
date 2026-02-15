import { CardSkeleton } from '@/components/skeletons/Skeleton';

export default function ProductDetailLoading() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <div className="h-96 w-full bg-gray-200 rounded-lg animate-pulse mb-4" />
          <div className="flex gap-2">
            <div className="h-20 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-20 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-20 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div>
          <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="space-y-4 mb-6">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-12 w-full bg-gray-200 rounded animate-pulse mb-4" />
          <CardSkeleton />
        </div>
      </div>
      <div>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
