"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Bell,
  CalendarPlus,
  Users,
  Settings,
  LogOut,
  Menu,
  LayoutList,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationStore, initRealtime, stopRealtime } from "@/lib/notification-store";
import { useCurrentUser } from "@/lib/user-store";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { createClient } from "@/lib/supabase/client";

const baseNavigation = [
  { name: "イベント", href: "/events", icon: CalendarPlus },
  { name: "予約一覧", href: "/bookings", icon: LayoutList },
  { name: "通知", href: "/activity", icon: Bell, showBadge: true },
  { name: "チームメンバー", href: "/team", icon: Users },
  { name: "設定", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useNotificationStore();
  const currentUser = useCurrentUser();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      initRealtime(currentUser.id);
    }
    return () => stopRealtime();
  }, [currentUser?.id]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const isExpanded = !isCollapsed;
  const displayName = currentUser?.full_name || "...";
  const displayCompany = currentUser?.company_name || "";
  const avatarLetter = currentUser?.full_name ? currentUser.full_name.charAt(0) : "?";

  return (
    <div
      className={cn(
        "relative flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200",
        isExpanded ? "w-60" : "w-[60px]"
      )}
    >
      {/* Logo + Hamburger */}
      <div
        className={cn(
          "flex h-[60px] items-center border-b border-gray-100 overflow-hidden transition-all duration-200",
          isCollapsed ? "justify-center px-0" : "px-3 gap-2.5"
        )}
      >
        <div
          className={cn(
            "flex-1 px-[9px]",
            isCollapsed && "flex-none !px-[0px]"
          )}>
          <Image
            className={cn(
              isCollapsed && "hidden"
            )}
            src="/common/logo.svg"
            alt="Pitasuke"
            width={125}
            height={40}
          />
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          aria-label={isCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-hidden">
        {baseNavigation.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              title={!isExpanded ? item.name : undefined}
              className={cn(
                "relative flex items-center rounded-lg px-[12px] py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-[#212529]",
                isExpanded ? "gap-3.5" : "gap-0"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-primary-600" : "text-gray-400"
                )}
              />
              <span
                className={cn(
                  "text-sm whitespace-nowrap transition-all duration-200",
                  isExpanded ? "flex-1 opacity-100" : "flex-none opacity-0 w-0 overflow-hidden"
                )}
              >
                {item.name}
              </span>
              {item.showBadge && unreadCount > 0 && isExpanded && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
              {item.showBadge && unreadCount > 0 && !isExpanded && (
                <span className="absolute left-7 top-2 flex h-2 w-2 items-center justify-center rounded-full bg-primary-500 text-[8px] font-bold text-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 p-2">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={displayName}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
              {avatarLetter}
            </div>
          )}
          <div
            className={cn(
              "flex-1 min-w-0 transition-all duration-200",
              isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
            )}
          >
            <p className="truncate text-sm font-medium">
              {displayName}
            </p>
            <p className="truncate text-xs text-gray-500">
              {displayCompany}
            </p>
          </div>
          {isExpanded && (
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              <DropdownMenu
                align="right"
                side="top"
                trigger={
                  <button
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                }
                items={[
                  {
                    label: "ログアウト",
                    icon: LogOut,
                    variant: "danger" as const,
                    onClick: handleLogout,
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
