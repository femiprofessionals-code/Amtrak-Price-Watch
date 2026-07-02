import { Badge } from "@/components/ui/badge";
import type { AlertStatus } from "@/generated/prisma/enums";

const config: Record<AlertStatus, { label: string; variant: "success" | "warning" | "primary" | "default" }> = {
  ACTIVE: { label: "Active", variant: "primary" },
  TRIGGERED: { label: "Target hit", variant: "success" },
  PAUSED: { label: "Paused", variant: "warning" },
  EXPIRED: { label: "Expired", variant: "default" },
};

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
