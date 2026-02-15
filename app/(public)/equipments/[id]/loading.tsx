import { CardSkeleton, TableSkeleton } from '@/components/skeletons/Skeleton';

export default function EquipmentDetailLoading() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="flex gap-4 mb-4">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="h-96 w-full bg-gray-200 rounded-lg animate-pulse mb-6" />
          <CardSkeleton />
        </div>
        <div>
          <CardSkeleton />
          <div className="mt-4">
            <CardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
