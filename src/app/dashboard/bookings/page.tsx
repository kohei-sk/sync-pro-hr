"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  Video,
  Building2,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  Mail,
  Users,
} from "lucide-react";
import { mockBookings, mockEventTypes, getUserById } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types";

type FilterStatus = "all" | BookingStatus;

export default function BookingsPage() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterEvent, setFilterEvent] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

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

  const statusCounts = useMemo(() => {
    const counts = { all: mockBookings.length, confirmed: 0, pending: 0, cancelled: 0 };
    mockBookings.forEach((b) => {
      counts[b.status]++;
    });
    return counts;
  }, []);

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

  const locationIcons: Record<string, typeof Video> = {
    online: Video,
    "in-person": Building2,
    phone: Phone,
  };

  function formatBookingDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }

  function formatBookingTime(startStr: string, endStr: string) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const fmt = (d: Date) =>
      d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
    return `${fmt(start)} - ${fmt(end)}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">予約一覧</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          面接・面談の予約を管理します
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 mb-4">
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

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="候補者名またはメールで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
          <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Booking List */}
      {filteredBookings.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12">
          <Calendar className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">
            該当する予約がありません
          </p>
          <p className="text-xs text-gray-400 mt-1">
            フィルター条件を変更してください
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const event = mockEventTypes.find(
              (e) => e.id === booking.event_id
            );
            const isExpanded = expandedBooking === booking.id;
            const statusInfo = statusConfig[booking.status];
            const StatusIcon = statusInfo.icon;
            const LocationIcon = locationIcons[event?.location_type || "online"];

            return (
              <div
                key={booking.id}
                className="card !p-0 overflow-hidden transition-shadow hover:shadow-card-hover"
              >
                {/* Main Row */}
                <button
                  onClick={() =>
                    setExpandedBooking(isExpanded ? null : booking.id)
                  }
                  className="flex w-full items-center gap-4 p-4 text-left"
                >
                  {/* Color indicator */}
                  <div
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: event?.color || "#0071c1" }}
                  />

                  {/* Candidate Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {booking.candidate_name}
                      </span>
                      <span className={statusInfo.className}>
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {event?.title}
                    </p>
                  </div>

                  {/* Date/Time */}
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {formatBookingDate(booking.start_time)}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {formatBookingTime(booking.start_time, booking.end_time)}
                    </div>
                  </div>

                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-gray-400 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {/* Contact */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          連絡先
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            {booking.candidate_email}
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          場所
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <LocationIcon className="h-3.5 w-3.5 text-gray-400" />
                          {event?.location_detail || "未設定"}
                        </div>
                        {booking.meeting_url && (
                          <a
                            href={booking.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                            ミーティングリンク
                          </a>
                        )}
                      </div>

                      {/* Assigned Members */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          面接官
                        </h4>
                        <div className="space-y-1">
                          {booking.assigned_members?.map((am) => {
                            const user = getUserById(am.user_id);
                            return (
                              <div
                                key={am.user_id}
                                className="flex items-center gap-2"
                              >
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
                                  {user?.full_name?.charAt(0) || "?"}
                                </div>
                                <span className="text-sm text-gray-700">
                                  {user?.full_name || "不明"}
                                </span>
                              </div>
                            );
                          })}
                          {!booking.assigned_members?.length && (
                            <p className="text-xs text-gray-400">未割当</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {booking.status !== "cancelled" && (
                      <div className="mt-4 flex gap-2 border-t border-gray-200/60 pt-3">
                        <button className="btn-ghost btn-size-s">
                          <MapPin className="h-3 w-3" />
                          リスケジュール
                        </button>
                        <button className="btn-ghost-danger btn-size-s">
                          <XCircle className="h-3 w-3" />
                          キャンセル
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
