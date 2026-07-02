"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

/** Fires a success toast once when landing on a freshly created alert. */
export function CreatedToast() {
  const toast = useToast();
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast("success", "Alert created — we're watching this fare for you.");
    // Drop the ?created=1 param so refreshes don't re-toast.
    router.replace(window.location.pathname, { scroll: false });
  }, [toast, router]);

  return null;
}
