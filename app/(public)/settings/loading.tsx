import { CardSkeleton } from '@/components/skeletons/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <CardSkeleton />
    </div>
  );
}
