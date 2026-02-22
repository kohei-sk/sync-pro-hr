"use client";

import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  RefreshCw,
  XCircle,
  Bell,
  CheckCheck,
} from "lucide-react";
import { mockNotifications } from "@/lib/mock-data";
import { useNotificationStore } from "@/lib/notification-store";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/types";

const notificationConfig: Record<
  NotificationType,
  {
    label: string;
    icon: typeof CalendarCheck;
    iconColor: string;
    iconBg: string;
    badgeClass: string;
  }
> = {
  booking_received: {
    label: "予約受付",
    icon: CalendarCheck,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
    badgeClass: "bg-green-50 text-green-700",
  },
  booking_changed: {
    label: "予約変更",
    icon: RefreshCw,
    iconColor: "text-primary-600",
    iconBg: "bg-primary-50",
    badgeClass: "bg-primary-50 text-primary-700",
  },
  booking_cancelled: {
    label: "予約キャンセル",
    icon: XCircle,
    iconColor: "text-red-500",
    iconBg: "bg-red-50",
    badgeClass: "bg-red-50 text-red-700",
  },
};

function getRelativeTime(timestamp: string): string {
  const now = new Date("2026-02-21T10:00:00Z");
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

export default function NotificationsPage() {
  const router = useRouter();
  const { unreadCount, isRead, markAsRead, markAllAsRead } =
    useNotificationStore();

  function handleNotificationClick(notificationId: string, bookingId: string) {
    markAsRead(notificationId);
    router.push(`/dashboard/bookings/${bookingId}`);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">通知</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            予約の受付・変更・キャンセルをお知らせします
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-ghost btn-size-s shrink-0 mt-0.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            すべて既読にする
          </button>
        )}
      </div>

      {/* Unread count chip */}
      {unreadCount > 0 && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-primary-500" />
          <span className="text-xs font-medium text-primary-700">
            {unreadCount}件の未読通知
          </span>
        </div>
      )}

      {/* Notification list */}
      {mockNotifications.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16">
          <Bell className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">通知はありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mockNotifications.map((notification) => {
            const read = isRead(notification.id);
            const cfg = notificationConfig[notification.type];
            const Icon = cfg.icon;

            return (
              <button
                key={notification.id}
                onClick={() =>
                  handleNotificationClick(notification.id, notification.booking_id)
                }
                className={cn(
                  "group relative w-full overflow-hidden rounded-lg border text-left transition-all",
                  "hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                  read
                    ? "border-gray-100 bg-white"
                    : "border-primary-100 bg-primary-50/30"
                )}
              >
                {/* Unread indicator bar */}
                {!read && (
                  <div className="absolute inset-y-0 left-0 w-1 bg-primary-500 rounded-l-lg" />
                )}

                <div className={cn("flex items-start gap-4 px-5 py-4", !read && "pl-6")}>
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      cfg.iconBg
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5", cfg.iconColor)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          cfg.badgeClass
                        )}
                      >
                        {cfg.label}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {getRelativeTime(notification.timestamp)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        read ? "text-gray-500" : "text-gray-800 font-medium"
                      )}
                    >
                      {notification.candidate_name}
                      <span
                        className={cn(
                          "ml-1",
                          read ? "text-gray-400" : "text-gray-600 font-normal"
                        )}
                      >
                        ・{notification.event_title}
                      </span>
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        read ? "text-gray-400" : "text-gray-500"
                      )}
                    >
                      {notification.message}
                    </p>
                    <p className="mt-2 text-xs font-medium text-primary-600 group-hover:text-primary-700">
                      予約の詳細を確認する →
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
