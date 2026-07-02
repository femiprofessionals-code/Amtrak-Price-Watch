import { Skeleton } from "@/components/ui/skeleton";

export default function AlertsLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-80 rounded-xl" />
        <Skeleton className="h-9 w-56" />
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
