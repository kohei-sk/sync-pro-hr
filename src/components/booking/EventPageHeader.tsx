import { Building2 } from "lucide-react";
import type { LocationType } from "@/types";

interface EventPageHeaderProps {
  title: string;
  duration: number;
  locationType: LocationType;
  companyName?: string;
}

export function EventPageHeader({
  title,
  duration,
  locationType,
  companyName,
}: EventPageHeaderProps) {
  const locationLabel =
    locationType === "online"
      ? "オンライン"
      : locationType === "in-person"
        ? "対面"
        : "電話";

  return (
    <div className="px-4 py-2.5 text-center border-b border-gray-200 sticky top-0 backdrop-blur-[18px] z-30">
      {companyName && (
        <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-1">
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          <p>{companyName}</p>
        </div>
      )}
      <h1 className="text-md font-bold">{title}</h1>
      <div className="mt-0.5 flex items-center justify-center gap-2 text-[11px] text-gray-400">
        <span className="flex items-center gap-1">
          {duration}分
        </span>
        <span className="text-gray-300">/</span>
        <span className="flex items-center gap-1">
          {locationLabel}
        </span>
      </div>
    </div>
  );
}
