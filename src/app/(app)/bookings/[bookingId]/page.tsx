"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
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
import { cn } from "@/lib/utils";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { BookingStatus } from "@/types";

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

const statusConfig: Record<
  BookingStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  confirmed: { label: "確定",       icon: CheckCircle2, className: "badge badge-green"  },
  pending:   { label: "保留",       icon: AlertCircle,  className: "badge badge-yellow" },
  cancelled: { label: "キャンセル", icon: XCircle,      className: "badge badge-red"    },
};

const locationConfig: Record<string, { icon: typeof Video; label: string }> = {
  online:      { icon: Video,     label: "オンライン" },
  "in-person": { icon: Building2, label: "対面"       },
  phone:       { icon: Phone,     label: "電話"       },
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

export default function BookingDetailPage() {
  const params = useParams();
  const toast = useToast();
  const bookingId = params.bookingId as string;

  const [booking, setBooking] = useState<BookingDetail | null | undefined>(undefined);
  const [currentStatus, setCurrentStatus] = useState<BookingStatus | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // 予約詳細取得
  useEffect(() => {
    setBooking(undefined); // ローディング状態へ
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => {
        if (r.status === 404) { setBooking(null); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setBooking(data);
          setCurrentStatus(data.status);
        }
      })
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
        setCurrentStatus("cancelled");
        setCancelOpen(false);
        toast.success("予約をキャンセルしました");
      } else {
        toast.error("キャンセルに失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setCancelling(false);
    }
  }

  function handleReschedule() {
    setRescheduleOpen(false);
    setNewDate("");
    setNewTime("");
    toast.success("リスケジュールの依頼を送信しました");
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

  const status = currentStatus ?? booking.status;
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;
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
                <StatusIcon className="h-3 w-3" />
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

      {/* Cancelled notice */}
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
            <div>
              <p className="text-sm">{event?.location_detail || locCfg.label}</p>
              {booking.meeting_url && (
                <a
                  href={booking.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                >
                  ミーティングリンクを開く
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
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
            // booking_members の profiles から該当 user_id を検索（見つかったもののみ）
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
                const channelLabel =
                  { email: "メール", sms: "SMS", both: "メール + SMS" }[reminder.channel] ||
                  reminder.channel;
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
      </div>

      {/* Actions */}
      {status !== "cancelled" && (
        <div className="p-4 flex gap-2 border-t border-gray-100">
          <button className="btn btn-ghost btn-size-s" onClick={() => setRescheduleOpen(true)}>
            <MapPin className="h-3 w-3" />
            リスケジュール
          </button>
          <button className="btn btn-ghost-danger btn-size-s" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-3 w-3" />
            キャンセル
          </button>
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

      {/* Reschedule modal */}
      <Modal
        open={rescheduleOpen}
        onClose={() => { setRescheduleOpen(false); setNewDate(""); setNewTime(""); }}
        title="リスケジュール"
        description="新しい日時を選択して候補者にリスケジュールを依頼します"
        size="sm"
        footer={
          <>
            <button
              onClick={() => { setRescheduleOpen(false); setNewDate(""); setNewTime(""); }}
              className="btn btn-ghost"
            >
              キャンセル
            </button>
            <button
              onClick={handleReschedule}
              disabled={!newDate || !newTime}
              className="btn btn-primary"
            >
              依頼を送信
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">新しい日付</label>
            <input type="date" className="input mt-1" value={newDate}
              onChange={(e) => setNewDate(e.target.value)} />
          </div>
          <div>
            <label className="label">新しい時刻</label>
            <input type="time" className="input mt-1" value={newTime}
              onChange={(e) => setNewTime(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
