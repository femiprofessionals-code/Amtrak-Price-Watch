import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-9 w-full max-w-xl rounded-xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
