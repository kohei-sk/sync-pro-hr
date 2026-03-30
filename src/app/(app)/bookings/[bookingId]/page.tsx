"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Mail,
  Video,
  Building2,
  Phone,
  ExternalLink,
  CheckCircle2,
  XCircle,
  MapPin,
  Users,
  History,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { invalidateNotifications } from "@/lib/notification-store";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { BookingStatus } from "@/types";

// 変更履歴エントリ
type BookingHistoryEntry = {
  id: string;
  type: string;
  description: string;
  created_at: string;
  actor_name?: string;
};

// API レスポンス型
type BookingDetail = {
  id: string;
  event_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone?: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  meeting_url?: string;
  custom_field_values?: Record<string, string>;
  booking_history: BookingHistoryEntry[];
  event_types: {
    id: string;
    title: string;
    color?: string;
    description?: string;
    scheduling_mode: string;
    location_type: string;
    location_detail?: string;
    weekday_schedule?: { day_index: number; member_ids: string[] }[];
    custom_fields: {
      id: string;
      event_id: string;
      label: string;
      type: string;
      is_required: boolean;
      sort_order: number;
      placeholder?: string;
    }[];
  } | null;
  booking_members: {
    id: string;
    user_id: string;
    role_id?: string;
    profiles?: { id: string; full_name: string; avatar_url?: string } | null;
    event_roles?: { id: string; name: string } | null;
  }[];
  booking_reminders: {
    id: string;
    channel: string;
    scheduled_at: string;
    sent_at?: string;
    status: string;
  }[];
};

type TextRenderer = { text: string };

const statusConfig: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  confirmed: { label: "予約確定", className: "badge badge-green" },
  completed: { label: "面接完了", className: "badge badge-blue" },
  cancelled: { label: "キャンセル", className: "badge badge-red" },
};

const historyTypeConfig: Record<string, { label: string; dotClass: string }> = {
  booking_created: { label: "予約確定", dotClass: "bg-green-500" },
  booking_changed: { label: "予約変更", dotClass: "bg-blue-500" },
  booking_admin_cancelled: { label: "管理者キャンセル", dotClass: "bg-red-500" },
  booking_candidate_cancelled: { label: "候補者キャンセル", dotClass: "bg-orange-500" },
};

const locationConfig: Record<string, { icon: typeof Video; label: string }> = {
  online: { icon: Video, label: "オンライン" },
  "in-person": { icon: MapPin, label: "対面" },
  phone: { icon: Phone, label: "電話" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });
}
function formatTime(startStr: string, endStr: string) {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(new Date(startStr))} – ${fmt(new Date(endStr))}`;
}
function formatDuration(startStr: string, endStr: string) {
  return `${(new Date(endStr).getTime() - new Date(startStr).getTime()) / 60000}分`;
}
function formatHistoryDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function computeDisplayStatus(status: BookingStatus, endTime: string): BookingStatus {
  if (status === "confirmed" && new Date(endTime) < new Date()) return "completed";
  return status;
}

function LinkifiedText({ text }: TextRenderer) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return (
    <>
      {text.split(urlRegex).map((part, index) => {
        const isUrl = part.match(/^https?:\/\/[^\s]+$/);

        return isUrl ? (
          <a
            className="text-primary-600 hover:text-primary-700 hover:underline"
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<BookingDetail | null | undefined>(undefined);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // 予約詳細取得
  useEffect(() => {
    setBooking(undefined);
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => {
        if (r.status === 404) { setBooking(null); return null; }
        return r.json();
      })
      .then((data) => { if (data) setBooking(data); })
      .catch(() => setBooking(null));
  }, [bookingId]);

  async function handleCancel() {
    if (!booking) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        setBooking((prev) => prev ? { ...prev, status: "cancelled" } : prev);
        setCancelOpen(false);
        toast.success("予約をキャンセルしました");
        // リアルタイム未受信の場合でも通知を即表示するためキャッシュを無効化
        invalidateNotifications();
      } else {
        toast.error("キャンセルに失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setCancelling(false);
    }
  }

  async function handleDelete() {
    if (!booking) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("予約を削除しました");
        router.push("/bookings");
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "削除に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setDeleting(false);
    }
  }

  // ローディング
  if (booking === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-primary-600 animate-spin" />
        <p className="text-sm">読み込み中...</p>
      </div>
    );
  }

  if (booking === null) {
    return (
      <div className="card flex flex-col items-center justify-center py-16">
        <Calendar className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">予約が見つかりません</p>
        <p className="text-xs text-gray-400 mt-1">URLを確認してください</p>
      </div>
    );
  }

  const status = computeDisplayStatus(booking.status, booking.end_time);
  const statusInfo = statusConfig[status];
  const event = booking.event_types;
  const locKey = event?.location_type || "online";
  const locCfg = locationConfig[locKey] ?? locationConfig.online;
  const LocationIcon = locCfg.icon;
  const eventCustomFields = event?.custom_fields ?? [];

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2">
              <h1 className="font-semibold text-base leading-relaxed">
                {booking.candidate_name}
              </h1>
              <span className={statusInfo.className}>
                {statusInfo.label}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: event?.color || "#0071c1" }}
              />
              <p className="text-sm text-gray-500 leading-relaxed">{event?.title}</p>
            </div>
            {event?.description && (
              <p className="mt-1 text-xs text-gray-400 leading-relaxed">{event.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status notices */}
      {status === "cancelled" && (
        <div className="p-6 pb-0">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm font-medium text-red-700">この予約はキャンセルされています</p>
            </div>
          </div>
        </div>
      )}
      {status === "completed" && (
        <div className="p-6 pb-0">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
              <p className="text-sm font-medium text-blue-700">この面接は完了しています</p>
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="px-6 py-5 divide-y divide-gray-100">
        {/* Date/Time */}
        <section className="py-4 first:pt-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm">
              <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{formatDate(booking.start_time)}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="h-4 w-4 shrink-0 text-gray-400" />
              <div>
                <span>{formatTime(booking.start_time, booking.end_time)}</span>
                <span className="text-xs text-gray-400 pl-2">
                  ({formatDuration(booking.start_time, booking.end_time)})
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-gray-400" />
              <a
                href={`mailto:${booking.candidate_email}`}
                className="text-primary-600 hover:text-primary-700 hover:underline"
              >
                {booking.candidate_email}
              </a>
            </div>
            {booking.candidate_phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                <a
                  href={`tel:${booking.candidate_phone}`}
                  className="text-primary-600 hover:text-primary-700 hover:underline"
                >
                  {booking.candidate_phone}
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Location */}
        <section className="py-4">
          <div className="flex items-start gap-2.5">
            <LocationIcon className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                {booking.meeting_url ? (
                  <a
                    target="_blank"
                    href={booking.meeting_url}
                    className="text-primary-600 hover:text-primary-700 hover:underline"
                  >
                    {booking.meeting_url}
                  </a>
                ) :
                  <LinkifiedText text={event?.location_detail ?? "-"} />
                }
              </p>
            </div>
          </div>
        </section>

        {/* Assigned Members */}
        <section className="py-4">
          <h2 className="section-label">
            メンバー
            {event?.scheduling_mode && (
              <span className="section-sub-label">
                （{event.scheduling_mode === "weekday"
                  ? "曜日モード"
                  : event.scheduling_mode === "fixed"
                    ? "固定モード"
                    : "プールモード"}）
              </span>
            )}
          </h2>

          {event?.scheduling_mode === "weekday" ? (() => {
            const dayIndex = (new Date(booking.start_time).getDay() + 6) % 7;
            const dayEntry = event.weekday_schedule?.find((e) => e.day_index === dayIndex);
            const dayMemberIds = dayEntry?.member_ids ?? [];
            const dayMembers = dayMemberIds
              .map((uid) => booking.booking_members.find((bm) => bm.user_id === uid))
              .filter((bm): bm is NonNullable<typeof bm> => bm != null);
            return dayMembers.length > 0 ? (
              <div className="inline-flex flex-wrap gap-x-4 gap-y-2">
                {dayMembers.map((bm) => (
                  <div key={bm.user_id} className="flex flex-wrap items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                      {bm.profiles?.full_name?.charAt(0) || "?"}
                    </div>
                    <p className="text-sm whitespace-nowrap">
                      {bm.profiles?.full_name || "不明"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-300">担当者未設定</p>
            );
          })() : booking.booking_members.length > 0 ? (
            <div className="inline-flex flex-wrap gap-x-4 gap-y-2">
              {booking.booking_members.map((bm) => {
                const showRole = event?.scheduling_mode !== "fixed";
                return (
                  <div key={bm.id} className="flex flex-wrap items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                      {bm.profiles?.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm whitespace-nowrap">
                        {bm.profiles?.full_name || "不明"}
                      </p>
                      {showRole && bm.event_roles?.name && (
                        <p className="text-xs text-gray-400 mt-0.5">{bm.event_roles.name}</p>
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

        {/* Reminders */}
        {booking.booking_reminders.length > 0 && (
          <section className="py-4">
            <h2 className="section-label">リマインド</h2>
            <div className="space-y-2">
              {booking.booking_reminders.map((reminder) => {
                const isSent = reminder.status === "sent";
                const isPending = reminder.status === "pending";
                const channelLabel = "メール";
                const scheduledDate = new Date(reminder.scheduled_at).toLocaleString("ja-JP", {
                  year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                });
                return (
                  <div key={reminder.id} className="flex items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span>{channelLabel}</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-xs text-gray-400">{scheduledDate}</span>
                    </div>
                    <span className={cn(
                      "badge ml-3",
                      isSent ? "badge-green" : isPending ? "badge badge-blue" : "badge-gray"
                    )}>
                      {isSent ? "送信済み" : isPending ? "送信予定" : "送信失敗"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Form Answers */}
        {eventCustomFields.length > 0 && booking.custom_field_values && (
          <section className="py-4 last:pb-0">
            <h2 className="section-label">フォームの回答</h2>
            <dl className="space-y-2">
              {eventCustomFields.map((field) => {
                const value = booking.custom_field_values?.[field.id];
                if (!value) return null;
                return (
                  <div key={field.id}>
                    <dt className="text-xs text-gray-400 mb-0.5">{field.label}</dt>
                    <dd className="text-sm break-all">
                      {field.type === "url" ? (
                        <a href={value} target="_blank" rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 hover:underline">
                          {value}
                        </a>
                      ) : field.type === "multiline" ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{value}</p>
                      ) : value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {/* 変更履歴 */}
        <section className="py-4">
          <button
            type="button"
            onClick={() => setHistoryOpen((o) => !o)}
            className="section-label mb-0 flex gap-1 items-center cursor-pointer select-none"
          >
            <span className="flex items-center gap-1.5">
              変更履歴
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
                historyOpen && "rotate-180"
              )}
            />
          </button>
          {historyOpen && (
            <div className="mt-3">
              {booking.booking_history.length === 0 ? (
                <p className="text-sm text-gray-400">履歴がありません</p>
              ) : (
                <ol className="relative border-l border-gray-200 ml-1.5 space-y-4">
                  {booking.booking_history.map((entry) => {
                    const cfg = historyTypeConfig[entry.type] ?? { label: entry.type, dotClass: "bg-gray-400" };
                    const bodyText =
                      entry.type === "booking_admin_cancelled" && entry.actor_name
                        ? `管理者（${entry.actor_name}）が ${event?.title || ""} の予約をキャンセルしました`
                        : entry.description || null;
                    return (
                      <li key={entry.id} className="ml-4">
                        <div className={cn(
                          "absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white",
                          cfg.dotClass
                        )} />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">{cfg.label}</span>
                          <span className="text-xs text-gray-400">{formatHistoryDate(entry.created_at)}</span>
                          {bodyText && (
                            <span className="text-xs text-gray-500 mt-0.5">{bodyText}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Actions */}
      {(status === "confirmed" || status === "completed" || status === "cancelled") && (
        <div className="p-4 flex gap-2 border-t border-gray-100">
          {status === "confirmed" && (
            <button className="btn btn-ghost-danger btn-size-s" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-3 w-3" />
              キャンセル
            </button>
          )}
          {(status === "completed" || status === "cancelled") && (
            <button className="btn btn-ghost-danger btn-size-s" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3 w-3" />
              削除
            </button>
          )}
        </div>
      )}

      {/* Cancel confirm */}
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="予約をキャンセルしますか？"
        description={`${booking.candidate_name} さんの予約をキャンセルします。この操作は取り消せません。`}
        confirmLabel={cancelling ? "処理中..." : "キャンセルする"}
        confirmVariant="danger"
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="予約を削除しますか？"
        description={`${booking.candidate_name} さんの予約データを完全に削除します。この操作は取り消せません。`}
        confirmLabel={deleting ? "処理中..." : "削除する"}
        confirmVariant="danger"
      />
    </div>
  );
}
