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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">予約一覧</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          面接・面談の予約を管理します
        </p>
      </div>

      {/* ── Filters ── */}
      {/* Status tabs */}
      <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
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
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filterStatus === status
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs",
                    filterStatus === status
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-200 text-gray-500"
                  )}
                >
                  {statusCounts[status]}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* Search + Event filter */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="候補者名またはメールで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="select appearance-none pl-9 pr-8 min-w-[180px]"
          >
            <option value="all">すべてのイベント</option>
            {mockEventTypes.map((evt) => (
              <option key={evt.id} value={evt.id}>
                {evt.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* ── Split panel ── */}
      <div className="flex flex-1 overflow-hidden rounded-xl ring-1 ring-gray-200/60">
        {/* Left panel: list */}
        <div className="flex w-[360px] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
          <div className="flex-1 overflow-y-auto">
            {filteredBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <Calendar className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-xs font-medium text-gray-500">
                  該当する予約がありません
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
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
                          "flex items-center gap-3 border-l-2 px-3 py-3 transition-colors",
                          isSelected
                            ? "border-l-primary-500 bg-primary-50"
                            : "border-l-transparent hover:bg-gray-50"
                        )}
                      >
                        {/* Event color indicator */}
                        <div
                          className="h-8 w-0.5 shrink-0 rounded-full"
                          style={{ backgroundColor: event?.color || "#0071c1" }}
                        />

                        {/* Candidate info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "text-xs font-semibold",
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
                          <p className="mt-0.5 truncate text-[11px] text-gray-500">
                            {event?.title}
                          </p>
                        </div>

                        {/* Date/Time */}
                        <div className="shrink-0 text-right">
                          <div className="flex items-center justify-end gap-1 text-[11px] text-gray-600">
                            <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
                            <span>{formatListDate(booking.start_time)}</span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-gray-400">
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
        <div className="flex-1 overflow-y-auto bg-[#f8f9fa] p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
