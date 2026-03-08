import { cn } from "@/lib/utils";
import type { EventStatus } from "@/types";

const STATUS_CONFIG: Record<EventStatus, { label: string; className: string }> = {
  active:   { label: "公開中",     className: "badge-green" },
  draft:    { label: "非公開",     className: "badge-gray" },
  archived: { label: "アーカイブ", className: "badge-red" },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return <span className={cn("badge", className)}>{label}</span>;
}
