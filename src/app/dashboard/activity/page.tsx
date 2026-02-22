"use client";

import { useState } from "react";
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

type NotificationTab = "unread" | "read";

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
    badgeClass: "badge-green",
  },
  booking_changed: {
    label: "予約変更",
    icon: RefreshCw,
    iconColor: "text-primary-600",
    iconBg: "bg-primary-50",
    badgeClass: "badge-blue",
  },
  booking_cancelled: {
    label: "予約キャンセル",
    icon: XCircle,
    iconColor: "text-red-500",
    iconBg: "bg-red-50",
    badgeClass: "badge-red",
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
  const { isRead, markAsRead, markAllAsRead } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<NotificationTab>("unread");

  const unreadNotifications = mockNotifications.filter((n) => !isRead(n.id));
  const readNotifications = mockNotifications.filter((n) => isRead(n.id));
  const displayedNotifications =
    activeTab === "unread" ? unreadNotifications : readNotifications;

  function handleNotificationClick(notificationId: string, bookingId: string) {
    markAsRead(notificationId);
    router.push(`/dashboard/bookings/${bookingId}`);
  }

  return (
    <div>
      {/* Header */}
      <header className="header mb-6">
        <div className="header-col">
          <h1 className="header-title">通知</h1>
          <p className="header-sub-title">
            予約の受付・変更・キャンセルをお知らせします
          </p>
        </div>
        {activeTab === "unread" && unreadNotifications.length > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-ghost btn-size-s"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            すべて既読にする
          </button>
        )}
      </header>

      {/* Tabs: 未読 / 既読 */}
      <div className="tab mb-6">
        {(["unread", "read"] as NotificationTab[]).map((tab) => {
          const count =
            tab === "unread"
              ? unreadNotifications.length
              : readNotifications.length;
          const label = tab === "unread" ? "未読" : "既読";
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "tab-item",
                activeTab === tab
                  ? "tab-item-active"
                  : ""
              )}
            >
              {label}
              <span
                className={cn(
                  "tab-badge",
                  activeTab === tab
                    ? "tab-bade-active"
                    : ""
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notification list */}
      {displayedNotifications.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16">
          <Bell className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {activeTab === "unread"
              ? "未読の通知はありません"
              : "既読の通知はありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedNotifications.map((notification) => {
            const read = isRead(notification.id);
            const cfg = notificationConfig[notification.type];
            const Icon = cfg.icon;

            return (
              <button
                key={notification.id}
                onClick={() =>
                  handleNotificationClick(
                    notification.id,
                    notification.booking_id
                  )
                }
                className={cn(
                  "group relative w-full overflow-hidden rounded-lg ring-1 text-left transition-all",
                  "hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
                  read
                    ? "bg-white ring-gray-200/60"
                    : "bg-primary-50/30 ring-primary-200/60"
                )}
              >
                {/* Unread indicator bar */}
                {!read && (
                  <div className="absolute inset-y-0 left-0 w-1 rounded-l-lg bg-primary-500" />
                )}

                <div
                  className={cn(
                    "flex items-start gap-4 px-5 py-4",
                    !read && "pl-6"
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      cfg.iconBg
                    )}
                  >
                    <Icon className={cn("h-4 w-4", cfg.iconColor)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className={cn("badge", cfg.badgeClass)}>
                        {cfg.label}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {getRelativeTime(notification.timestamp)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        read ? "text-gray-500" : "font-medium text-gray-800"
                      )}
                    >
                      {notification.candidate_name}
                      <span
                        className={cn(
                          "ml-1",
                          read ? "text-gray-400" : "font-normal text-gray-600"
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
