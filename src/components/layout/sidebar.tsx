"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  LayoutDashboard,
  CalendarPlus,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "ダッシュボード",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "イベントタイプ",
    href: "/dashboard/events",
    icon: CalendarPlus,
  },
  {
    name: "予約一覧",
    href: "/dashboard/bookings",
    icon: Calendar,
  },
  {
    name: "チームメンバー",
    href: "/dashboard/team",
    icon: Users,
  },
  {
    name: "設定",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6">
        <Calendar className="h-7 w-7 text-primary-600" />
        <span className="text-lg font-bold text-gray-900">SyncPro HR</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-primary-600" : "text-gray-400"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
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
          <button className="text-gray-400 hover:text-gray-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
