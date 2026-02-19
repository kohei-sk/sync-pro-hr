"use client";

import { useState } from "react";
import {
  Users,
  Mail,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Plus,
  Search,
  MoreVertical,
  CalendarPlus,
} from "lucide-react";
import {
  mockUsers,
  mockEventTypes,
  mockRoles,
  mockMembers,
  mockBookings,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = mockUsers.filter(
    (u) =>
      !searchQuery ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getUserStats(userId: string) {
    const memberEntries = mockMembers.filter((m) => m.user_id === userId);
    const roleIds = memberEntries.map((m) => m.role_id);
    const eventIds = new Set(
      mockRoles
        .filter((r) => roleIds.includes(r.id))
        .map((r) => r.event_id)
    );
    const upcomingBookings = mockBookings.filter(
      (b) =>
        b.status === "confirmed" &&
        b.assigned_members?.some((am) => am.user_id === userId) &&
        new Date(b.start_time) >= new Date("2026-02-18")
    );
    return {
      eventCount: eventIds.size,
      upcomingBookings: upcomingBookings.length,
    };
  }

  const calendarStatusConfig: Record<
    NonNullable<User["calendar_status"]>,
    { label: string; icon: typeof CheckCircle2; className: string; bgClass: string }
  > = {
    connected: {
      label: "接続済み",
      icon: CheckCircle2,
      className: "text-green-600",
      bgClass: "bg-green-50",
    },
    error: {
      label: "エラー",
      icon: AlertTriangle,
      className: "text-amber-600",
      bgClass: "bg-amber-50",
    },
    not_connected: {
      label: "未接続",
      icon: XCircle,
      className: "text-gray-400",
      bgClass: "bg-gray-50",
    },
  };

  const connectedCount = mockUsers.filter(
    (u) => u.calendar_status === "connected"
  ).length;
  const errorCount = mockUsers.filter(
    (u) => u.calendar_status === "error"
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">チームメンバー</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            メンバーとカレンダー連携の状態を管理します
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="mr-1.5 h-4 w-4" />
          メンバー招待
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {mockUsers.length}
            </p>
            <p className="text-xs text-gray-500">合計メンバー</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {connectedCount}
            </p>
            <p className="text-xs text-gray-500">カレンダー接続済み</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{errorCount}</p>
            <p className="text-xs text-gray-500">要対応</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="名前またはメールで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Member List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const stats = getUserStats(user.id);
          const calStatus =
            calendarStatusConfig[user.calendar_status || "not_connected"];
          const CalStatusIcon = calStatus.icon;
          const initial = user.full_name.charAt(0);
          const syncTimeStr = user.last_synced_at
            ? formatSyncTime(user.last_synced_at)
            : null;

          return (
            <div
              key={user.id}
              className="card !p-0 overflow-hidden transition-shadow hover:shadow-card-hover"
            >
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                  {initial}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {user.full_name}
                    </h3>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">
                      {stats.eventCount}
                    </p>
                    <p className="text-xs text-gray-500">イベント</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">
                      {stats.upcomingBookings}
                    </p>
                    <p className="text-xs text-gray-500">予定面接</p>
                  </div>
                </div>

                {/* Calendar Status */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 shrink-0",
                    calStatus.bgClass
                  )}
                >
                  <CalStatusIcon
                    className={cn("h-3.5 w-3.5", calStatus.className)}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      calStatus.className
                    )}
                  >
                    {calStatus.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {user.calendar_status === "error" && (
                    <button
                      className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50"
                      title="再接続"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  {user.calendar_status === "not_connected" && (
                    <button
                      className="rounded-md p-1.5 text-primary-600 hover:bg-primary-50"
                      title="カレンダー接続"
                    >
                      <CalendarPlus className="h-4 w-4" />
                    </button>
                  )}
                  <button className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Sync info bar */}
              {syncTimeStr && (
                <div className="flex items-center gap-1.5 border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  最終同期: {syncTimeStr}
                </div>
              )}
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="card flex flex-col items-center justify-center py-12">
            <Users className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">
              該当するメンバーが見つかりません
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatSyncTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
