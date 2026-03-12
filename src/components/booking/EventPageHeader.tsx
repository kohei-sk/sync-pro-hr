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
      <div className="px-4 pt-2.5 pb-2">
        {companyName && (
          <h1 className="text-md font-bold">{companyName}</h1>
        )}
      </div>
      <div className="p-2 px-4 flex items-center justify-center gap-5">
        <div className="text-gray-500 text-xs text-left">
          <p>{title}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Clock className="w-3 h-3 min-w-3" />
            {duration}分
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap">
            <MapPin className="w-3 h-3 min-w-3" />
            {locationLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
