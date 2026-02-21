"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Bell,
  CalendarPlus,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/lib/notification-store";

const baseNavigation = [
  { name: "イベント", href: "/dashboard/events", icon: CalendarPlus },
  { name: "予約一覧", href: "/dashboard/bookings", icon: Calendar },
  { name: "通知", href: "/dashboard/activity", icon: Bell, showBadge: true },
  { name: "チームメンバー", href: "/dashboard/team", icon: Users },
  { name: "設定", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { unreadCount } = useNotificationStore();

  return (
    <div className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
          <Calendar className="h-4.5 w-4.5 text-white" />
        </div>
        <span className="text-base font-bold text-gray-900">SyncPro HR</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {baseNavigation.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive ? "text-primary-600" : "text-gray-400"
                )}
              />
              <span className="flex-1">{item.name}</span>
              {item.showBadge && unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
            田
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">
              田中 太郎
            </p>
            <p className="truncate text-xs text-gray-500">
              tanaka@example.com
            </p>
          </div>
          <button className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
