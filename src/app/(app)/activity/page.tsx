"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  RefreshCw,
  XCircle,
  Bell,
  CheckCheck,
  ChevronDown,
  Filter,
} from "lucide-react";
import { useNotificationStore, markAsReadSilent } from "@/lib/notification-store";
import { useToast } from "@/components/ui/Toast";
import { PageLoader } from "@/components/ui/PageLoader";
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
  }
> = {
  booking_received: {
    label: "予約受付",
    icon: CalendarCheck,
    iconColor: "text-green-700",
    iconBg: "bg-green-50",
  },
  booking_changed: {
    label: "予約変更",
    icon: RefreshCw,
    iconColor: "text-primary-700",
    iconBg: "bg-primary-50",
  },
  booking_cancelled: {
    label: "予約キャンセル",
    icon: XCircle,
    iconColor: "text-red-700",
    iconBg: "bg-red-50",
  },
};

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
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
  const toast = useToast();
  const { notifications, loading, isRead, markAllAsRead } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<NotificationTab>("unread");
  const [filterType, setFilterType] = useState<"all" | NotificationType>("all");
  const [markingAll, setMarkingAll] = useState(false);

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);
  const displayedNotifications = (
    activeTab === "unread" ? unreadNotifications : readNotifications
  ).filter((n) => filterType === "all" || n.type === filterType);

  // タブ切替時にスクロール位置をリセット（初回訪問時はスキップ）
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current === activeTab) return;
    prevTabRef.current = activeTab;
    document.querySelector("main")?.scrollTo({ top: 96, left: 0 });
  }, [activeTab]);

  function handleNotificationClick(notificationId: string, bookingId: string) {
    // emit() を呼ばない silent 版でカードを消さずに遷移
    markAsReadSilent(notificationId);
    router.push(`/bookings/${bookingId}`);
  }

  async function handleMarkAllAsRead() {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      toast.success("すべて既読にしました");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <header className="header mb-6">
        <div className="header-col">
          <h1 className="header-title">通知</h1>
        </div>
      </header>

      {/* Tabs: 未読 / 既読 */}
      <div className="sticky-wrap mb-6">
        <div className="tab">
          {(["unread", "read"] as NotificationTab[]).map((tab) => {
            const count =
              tab === "unread" ? unreadNotifications.length : readNotifications.length;
            const label = tab === "unread" ? "未読" : "既読";
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn("tab-item", activeTab === tab ? "tab-item-active" : "")}
              >
                {label}
                <span
                  className={cn(
                    "tab-badge",
                    activeTab === tab ? "tab-badge-active" : ""
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <div className="flex items-center gap-3 ml-auto">
            {/* All Read Btn */}
            {activeTab === "unread" && unreadNotifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="btn btn-ghost btn-size-s ml-auto"
              >
                {markingAll ? (
                  <span className="spinner" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                すべて既読にする
              </button>
            )}

            {/* Filter */}
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as "all" | NotificationType)}
                className="select appearance-none pl-8 pr-8 !py-1 min-w-[160px] text-xs h-[32px]"
              >
                <option value="all">すべての通知</option>
                <option value="booking_received">予約受付</option>
                <option value="booking_cancelled">予約キャンセル</option>
                <option value="booking_changed">予約変更</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <PageLoader />
      ) : displayedNotifications.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16">
          <Bell className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {activeTab === "unread" ? "未読の通知はありません" : "既読の通知はありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedNotifications.map((notification) => {
            const read = isRead(notification.id);
            const cfg = notificationConfig[notification.type] ?? notificationConfig.booking_received;
            const Icon = cfg.icon;

            return (
              <button
                key={notification.id}
                onClick={() =>
                  handleNotificationClick(notification.id, notification.booking_id)
                }
                className={cn(
                  "card card-clickable",
                  "transition-shadow hover:shadow-card-hover w-full text-left !p-0"
                )}
              >
                <div className="flex items-center gap-5 px-5 py-4">
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
                      <span className="shrink-0 text-xs text-gray-400">
                        {getRelativeTime(notification.created_at)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        read ? "text-gray-500" : "font-semibold"
                      )}
                    >
                      {notification.candidate_name}
                      <span
                        className={cn(
                          "ml-1",
                          read ? "text-gray-400" : "font-normal text-gray-500"
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
