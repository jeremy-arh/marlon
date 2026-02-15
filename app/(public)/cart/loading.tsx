import { CardSkeleton, TableSkeleton } from '@/components/skeletons/Skeleton';

export default function CartLoading() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TableSkeleton rows={5} />
        </div>
        <div>
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
