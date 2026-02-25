"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronDown,
  Mail,
  MessageSquare,
} from "lucide-react";
import { mockBookings, mockEventTypes } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types";

type FilterStatus = "all" | BookingStatus;

const statusConfig: Record<
  BookingStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  confirmed: {
    label: "確定",
    icon: CheckCircle2,
    className: "badge badge-green",
  },
  pending: {
    label: "保留",
    icon: AlertCircle,
    className: "badge badge-yellow",
  },
  cancelled: {
    label: "キャンセル",
    icon: XCircle,
    className: "badge badge-red",
  },
};

function formatListDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function formatListTime(startStr: string, endStr: string) {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(new Date(startStr))} – ${fmt(new Date(endStr))}`;
}

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detect the selected booking from the URL path
  const selectedId =
    pathname.startsWith("/dashboard/bookings/")
      ? pathname.split("/").pop() ?? null
      : null;

  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: mockBookings.length,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
    };
    mockBookings.forEach((b) => {
      counts[b.status]++;
    });
    return counts;
  }, []);

  const filteredBookings = useMemo(() => {
    return mockBookings
      .filter((b) => {
        if (filterStatus !== "all" && b.status !== filterStatus) return false;
        if (filterEvent !== "all" && b.event_id !== filterEvent) return false;
        if (
          searchQuery &&
          !b.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !b.candidate_email.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
  }, [filterStatus, filterEvent, searchQuery]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Page header ── */}
      <header className="header mb-6">
        <div className="header-col">
          <h1 className="header-title">予約一覧</h1>
          <p className="header-sub-title">
            面接・面談の予約を管理します
          </p>
        </div>
      </header>

      {/* ── Filters ── */}
      {/* Status tabs */}
      <div className="tab mb-6">
        {(["all", "confirmed", "pending", "cancelled"] as FilterStatus[]).map(
          (status) => {
            const label =
              status === "all"
                ? "すべて"
                : statusConfig[status as BookingStatus].label;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "tab-item",
                  filterStatus === status
                    ? "tab-item-active"
                    : ""
                )}
              >
                {label}
                <span
                  className={cn(
                    "tab-badge",
                    filterStatus === status
                      ? "tab-badge-active"
                      : ""
                  )}
                >
                  {statusCounts[status]}
                </span>
              </button>
            );
          }
        )}

        {/* Search + Event filter */}
        <div className="flex items-center gap-3 w-[450px] ml-auto">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="候補者名またはメールで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 text-xs h-[32px]"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="select appearance-none pl-8 pr-8 !py-0.5 min-w-[180px] text-xs h-[32px]"
            >
              <option value="all">すべてのイベント</option>
              {mockEventTypes.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* ── Split panel ── */}
      <div className="flex flex-1 overflow-hidden rounded-xl ring-1 ring-gray-200/60">
        {/* Left panel: list */}
        <div className="flex w-[360px] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
          <div className="flex-1 overflow-y-auto">
            {filteredBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  該当する予約がありません
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  フィルター条件を変更してください
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => {
                  const event = mockEventTypes.find(
                    (e) => e.id === booking.event_id
                  );
                  const statusInfo = statusConfig[booking.status];
                  const StatusIcon = statusInfo.icon;
                  const isSelected = selectedId === booking.id;

                  return (
                    <li key={booking.id}>
                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className={cn(
                          "flex items-center gap-3 border-l-2 p-4 transition-colors",
                          isSelected
                            ? "border-l-primary-500 bg-primary-50"
                            : "border-l-transparent hover:bg-gray-50"
                        )}
                      >

                        {/* Candidate info */}
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                isSelected ? "text-gray-900" : "text-gray-800"
                              )}
                            >
                              {booking.candidate_name}
                            </span>
                            <span className={statusInfo.className}>
                              <StatusIcon className="h-3 w-3" />
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: event?.color || "#0071c1" }}
                            />
                            <p className="truncate text-[11px] text-gray-500 text-xs">
                              {event?.title}
                            </p>
                          </div>
                          {/* Reminder badges */}
                          {booking.reminders && booking.reminders.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {(() => {
                                const hasEmail = booking.reminders!.some((r) => r.channel === "email" || r.channel === "both");
                                const hasSms = booking.reminders!.some((r) => r.channel === "sms" || r.channel === "both");
                                const allSent = booking.reminders!.every((r) => r.status === "sent");
                                const iconClass = allSent ? "text-green-500" : "text-primary-400";
                                return (
                                  <>
                                    {hasEmail && (
                                      <Mail className={cn("h-3 w-3", iconClass)} title={allSent ? "メール送信済み" : "メール設定済み"} />
                                    )}
                                    {hasSms && (
                                      <MessageSquare className={cn("h-3 w-3", iconClass)} title={allSent ? "SMS送信済み" : "SMS設定済み"} />
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Date/Time */}
                        <div className="flex flex-col items-left gap-0.5">
                          <div className="flex items-center justify-end gap-1 text-[11px] text-gray-500">
                            <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
                            <span>{formatListDate(booking.start_time)}</span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-gray-500">
                            <Clock className="h-3 w-3 shrink-0 text-gray-400" />
                            <span>
                              {formatListTime(
                                booking.start_time,
                                booking.end_time
                              )}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right panel: detail */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          {children}
        </div>
      </div>
    </div >
  );
}
