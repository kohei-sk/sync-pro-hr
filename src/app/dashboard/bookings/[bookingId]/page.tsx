"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  Calendar,
  Clock,
  Mail,
  Video,
  Building2,
  Phone,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MapPin,
  Users,
} from "lucide-react";
import {
  getBookingById,
  mockEventTypes,
  mockRoles,
  getUserById,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/types";

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

const locationConfig: Record<
  string,
  { icon: typeof Video; label: string }
> = {
  online: { icon: Video, label: "オンライン" },
  "in-person": { icon: Building2, label: "対面" },
  phone: { icon: Phone, label: "電話" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(startStr: string, endStr: string) {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(new Date(startStr))} – ${fmt(new Date(endStr))}`;
}

function formatDuration(startStr: string, endStr: string) {
  const diff = (new Date(endStr).getTime() - new Date(startStr).getTime()) / 60000;
  return `${diff}分`;
}

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const booking = getBookingById(bookingId);

  if (!booking) {
    return (
      <div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          予約一覧
        </Link>
        <div className="card flex flex-col items-center justify-center py-16">
          <Calendar className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">予約が見つかりません</p>
          <p className="text-xs text-gray-400 mt-1">URLを確認してください</p>
        </div>
      </div>
    );
  }

  const event = mockEventTypes.find((e) => e.id === booking.event_id);
  const statusInfo = statusConfig[booking.status];
  const StatusIcon = statusInfo.icon;
  const locCfg = locationConfig[event?.location_type || "online"];
  const LocationIcon = locCfg.icon;

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        予約一覧
      </Link>

      {/* Header card */}
      <div className="card mb-4">
        <div className="flex items-start gap-4">
          {/* Event color bar */}
          <div
            className="mt-1 h-12 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: event?.color || "#0071c1" }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">
                {booking.candidate_name}
              </h1>
              <span className={statusInfo.className}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{event?.title}</p>
            {event?.description && (
              <p className="mt-1.5 text-xs text-gray-400">{event.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Cancelled notice */}
      {booking.status === "cancelled" && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700">
              この予約はキャンセルされています
            </p>
          </div>
        </div>
      )}

      {/* Details card */}
      <div className="card divide-y divide-gray-100">
        {/* Date/Time */}
        <section className="py-4 first:pt-0 last:pb-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            日時
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm text-gray-800">
              <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{formatDate(booking.start_time)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-gray-800">
              <Clock className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{formatTime(booking.start_time, booking.end_time)}</span>
              <span className="text-gray-400">
                ({formatDuration(booking.start_time, booking.end_time)})
              </span>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            候補者連絡先
          </h2>
          <div className="flex items-center gap-2.5 text-sm text-gray-800">
            <Mail className="h-4 w-4 shrink-0 text-gray-400" />
            <a
              href={`mailto:${booking.candidate_email}`}
              className="text-primary-600 hover:text-primary-700 hover:underline"
            >
              {booking.candidate_email}
            </a>
          </div>
        </section>

        {/* Location */}
        <section className="py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            場所
          </h2>
          <div className="flex items-start gap-2.5">
            <LocationIcon className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-800">
                {event?.location_detail || locCfg.label}
              </p>
              {booking.meeting_url && (
                <a
                  href={booking.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  <ExternalLink className="h-3 w-3" />
                  ミーティングリンクを開く
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Assigned Members */}
        <section className="py-4 last:pb-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            面接官
          </h2>
          {booking.assigned_members && booking.assigned_members.length > 0 ? (
            <div className="space-y-2.5">
              {booking.assigned_members.map((am) => {
                const user = getUserById(am.user_id);
                const role = mockRoles.find((r) => r.id === am.role_id);
                return (
                  <div key={am.user_id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {user?.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {user?.full_name || "不明"}
                      </p>
                      {role && (
                        <p className="text-xs text-gray-400">{role.name}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users className="h-4 w-4" />
              <span>未割当</span>
            </div>
          )}
        </section>
      </div>

      {/* Actions */}
      {booking.status !== "cancelled" && (
        <div className="mt-4 flex gap-2">
          <button className="btn-ghost btn-size-s">
            <MapPin className="h-3.5 w-3.5" />
            リスケジュール
          </button>
          <button className="btn-ghost-danger btn-size-s">
            <XCircle className="h-3.5 w-3.5" />
            キャンセル
          </button>
        </div>
      )}
    </div>
  );
}
