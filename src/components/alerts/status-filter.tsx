"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

type Filter = "all" | "active" | "triggered" | "paused" | "expired";

export function StatusFilter({
  current,
  counts,
}: {
  current: Filter;
  counts: Record<Filter, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const change = (value: Filter) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete("status");
    else params.set("status", value);
    router.push(`/alerts?${params.toString()}`);
  };

  return (
    <Tabs
      value={current}
      onChange={change}
      tabs={[
        { value: "all", label: "All", count: counts.all },
        { value: "active", label: "Active", count: counts.active },
        { value: "triggered", label: "Target hit", count: counts.triggered },
        { value: "paused", label: "Paused", count: counts.paused },
        { value: "expired", label: "Expired", count: counts.expired },
      ]}
    />
  );
}
