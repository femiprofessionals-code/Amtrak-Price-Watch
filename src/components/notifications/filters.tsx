"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { IconSearch } from "@/components/app/icons";

type TypeFilter = "all" | "price_drop" | "alert_created" | "alert_updated" | "system";

export function NotificationFilters({
  current,
  unreadOnly,
  q,
}: {
  current: TypeFilter;
  unreadOnly: boolean;
  q: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    router.push(`/notifications?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="max-w-full overflow-x-auto">
        <Tabs
          value={current}
          onChange={(v) => update((p) => (v === "all" ? p.delete("type") : p.set("type", v)))}
          tabs={[
            { value: "all", label: "All" },
            { value: "price_drop", label: "Price drops" },
            { value: "alert_created", label: "Created" },
            { value: "alert_updated", label: "Updated" },
            { value: "system", label: "System" },
          ]}
        />
      </div>

      <div className="ml-auto flex items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-muted-foreground">
          Unread only
          <Switch
            checked={unreadOnly}
            onCheckedChange={(v) => update((p) => (v ? p.set("unread", "1") : p.delete("unread")))}
            label="Show unread only"
          />
        </label>
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q") as string;
            update((p) => (value ? p.set("q", value) : p.delete("q")));
          }}
        >
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search…"
            aria-label="Search notifications"
            className="h-9 w-44 rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-soft placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30 sm:w-56"
          />
        </form>
      </div>
    </div>
  );
}
