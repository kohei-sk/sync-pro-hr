import { Clock, MapPin } from "lucide-react";
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
    <div className="text-center border-b border-gray-200 sticky top-0 backdrop-blur-[18px] z-30">
      <div className="px-4 py-2.5">
        {companyName && (
          <div className="flex items-center justify-center gap-1 text-gray-500 text-xs mb-0.5">
            <p>{companyName}</p>
          </div>
        )}
        <h1 className="text-md font-bold">{title}</h1>
      </div>
      <div className="p-1.5 flex items-center justify-center gap-3.5 text-[11px] text-gray-400 border-t border-gray-200">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {duration}分
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {locationLabel}
        </span>
      </div>
    </div>
  );
}
