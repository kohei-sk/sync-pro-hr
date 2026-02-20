"use client";

import {
  CalendarCheck,
  XCircle,
  PlusCircle,
  Users,
  Clock,
} from "lucide-react";
import { mockActivities } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const activityIcons: Record<string, typeof CalendarCheck> = {
  booking_created: CalendarCheck,
  booking_cancelled: XCircle,
  event_created: PlusCircle,
  member_added: Users,
};

const activityColors: Record<string, string> = {
  booking_created: "text-green-500",
  booking_cancelled: "text-red-400",
  event_created: "text-primary-500",
  member_added: "text-purple-500",
};

const activityBgColors: Record<string, string> = {
  booking_created: "bg-green-50",
  booking_cancelled: "bg-red-50",
  event_created: "bg-primary-50",
  member_added: "bg-purple-50",
};

function getRelativeTime(timestamp: string): string {
  const now = new Date("2026-02-20T10:00:00Z");
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return new Date(timestamp).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

const activityTypeLabels: Record<string, string> = {
  booking_created: "予約作成",
  booking_cancelled: "予約キャンセル",
  event_created: "イベント作成",
  member_added: "メンバー追加",
};

export default function ActivityPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">アクティビティ</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          最近の操作履歴を確認できます
        </p>
      </div>

      <div className="card max-w-2xl">
        <div className="space-y-0">
          {mockActivities.map((activity, index) => {
            const Icon = activityIcons[activity.type] || Clock;
            const color = activityColors[activity.type] || "text-gray-400";
            const bg = activityBgColors[activity.type] || "bg-gray-50";
            const timeAgo = getRelativeTime(activity.timestamp);
            const typeLabel = activityTypeLabels[activity.type] || activity.type;
            const isLast = index === mockActivities.length - 1;

            return (
              <div key={activity.id} className="relative flex gap-4">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-100" />
                )}

                {/* Icon */}
                <div className="relative shrink-0 mt-1">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      bg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", color)} />
                  </div>
                </div>

                {/* Content */}
                <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium mb-1",
                          bg,
                          color
                        )}
                      >
                        {typeLabel}
                      </span>
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {activity.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400 mt-0.5">
                      {timeAgo}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(activity.timestamp).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
