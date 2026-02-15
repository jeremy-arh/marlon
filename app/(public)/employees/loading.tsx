import { TableSkeleton } from '@/components/skeletons/Skeleton';

export default function EmployeesLoading() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}
