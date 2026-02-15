import { CardSkeleton, TableSkeleton } from '@/components/skeletons/Skeleton';

export default function EmployeeDetailLoading() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <CardSkeleton />
          <div className="mt-6">
            <TableSkeleton rows={6} />
          </div>
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
