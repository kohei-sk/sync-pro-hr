"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types";

type FilterStatus = "all" | BookingStatus;

type BookingWithEvent = {
  id: string;
  event_id: string;
  candidate_name: string;
  candidate_email: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  event_types?: { id: string; title: string; color?: string } | null;
};

type EventOption = { id: string; title: string };

const statusConfig: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  confirmed: { label: "予約確定", className: "badge badge-green" },
  completed: { label: "面接完了", className: "badge badge-blue" },
  cancelled: { label: "キャンセル", className: "badge badge-red" },
};

function computeDisplayStatus(b: BookingWithEvent): BookingStatus {
  if (b.status === "confirmed" && new Date(b.end_time) < new Date()) {
    return "completed";
  }
  return b.status;
}

function formatListDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "short", day: "numeric", weekday: "short",
  });
}
function formatListTime(startStr: string, endStr: string) {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(new Date(startStr))} – ${fmt(new Date(endStr))}`;
}

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [bookings, setBookings] = useState<BookingWithEvent[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.querySelector("#booking-list-scroll-top")?.scrollTo({ top: 0, left: 0 });
  }, [filterStatus]);

  const fetchBookings = useCallback(() => {
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setBookings(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // 予約一覧・イベント一覧を並行取得
  useEffect(() => {
    Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
    ])
      .then(([bookingsData, eventsData]) => {
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // 予約のリアルタイム更新
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("bookings-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bookings" },
        () => fetchBookings()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        () => fetchBookings()
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchBookings]);

  const selectedId = pathname.startsWith("/bookings/")
    ? pathname.split("/").pop() ?? null
    : null;

  // 表示ステータスに変換した予約リスト（メモ化）
  const bookingsWithDisplayStatus = useMemo(() => {
    return bookings.map((b) => ({ ...b, displayStatus: computeDisplayStatus(b) }));
  }, [bookings]);

  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = { all: bookings.length, confirmed: 0, completed: 0, cancelled: 0 };
    bookingsWithDisplayStatus.forEach((b) => {
      if (b.displayStatus in counts) counts[b.displayStatus]++;
    });
    return counts;
  }, [bookings, bookingsWithDisplayStatus]);

  const filteredBookings = useMemo(() => {
    return bookingsWithDisplayStatus
      .filter((b) => {
        if (filterStatus !== "all" && b.displayStatus !== filterStatus) return false;
        if (filterEvent !== "all" && b.event_id !== filterEvent) return false;
        if (
          searchQuery &&
          !b.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !b.candidate_email.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [bookingsWithDisplayStatus, filterStatus, filterEvent, searchQuery]);

  return (
    <div className="flex h-full flex-col">
      <header className="header mb-6">
        <div className="header-col">
          <h1 className="header-title">予約一覧</h1>
        </div>
      </header>

      {/* Filters */}
      <div className="sticky-wrap mb-6">
        <div className="tab">
          {(["all", "confirmed", "completed", "cancelled"] as FilterStatus[]).map((status) => {
            const label = status === "all" ? "すべて" : statusConfig[status as BookingStatus].label;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn("tab-item", filterStatus === status ? "tab-item-active" : "")}
              >
                {label}
                <span className={cn("tab-badge", filterStatus === status ? "tab-badge-active" : "")}>
                  {statusCounts[status]}
                </span>
              </button>
            );
          })}

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
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>{evt.title}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden rounded-xl ring-1 ring-gray-200/60">
        {/* Left: list */}
        <div className="flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white w-[250px] lg:w-[360px]">
          <div className="flex-1 overflow-y-auto" id="booking-list-scroll-top">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-primary-600 animate-spin" />
                <p className="text-sm">読み込み中...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">該当する予約がありません</p>
                <p className="mt-1 text-xs text-gray-400">フィルター条件を変更してください</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => {
                  const event = booking.event_types;
                  const statusInfo = statusConfig[booking.displayStatus];
                  const isSelected = selectedId === booking.id;

                  return (
                    <li key={booking.id}>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className={cn(
                          "flex items-center gap-3 border-l-2 p-4 transition-colors",
                          isSelected
                            ? "border-l-primary-500 bg-primary-50"
                            : "border-l-transparent hover:bg-gray-50"
                        )}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">{booking.candidate_name}</span>
                            <span className={statusInfo.className}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <div
                              className="min-w-1.5 h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: event?.color || "#0071c1" }}
                            />
                            <p className="truncate text-gray-500 text-xs">{event?.title || "—"}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-xs text-gray-400">{formatListDate(booking.start_time)}</div>
                          <div className="text-xs text-gray-400">{formatListTime(booking.start_time, booking.end_time)}</div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex-1 overflow-y-auto bg-white">{children}</div>
      </div>
    </div>
  );
}
