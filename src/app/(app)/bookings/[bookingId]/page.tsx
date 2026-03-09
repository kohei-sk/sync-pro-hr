"use client";

import { useState } from "react";
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
  FileText,
  Bell,
  MessageSquare,
} from "lucide-react";
import {
  getBookingById,
  mockEventTypes,
  mockRoles,
  mockCustomFields,
  getUserById,
} from "@/lib/mock-data";
import { WEEKDAY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
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
  const toast = useToast();
  const bookingId = params.bookingId as string;
  const booking = getBookingById(bookingId);

  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  function handleCancel() {
    setBookingStatus("cancelled");
    setCancelOpen(false);
    toast.success("予約をキャンセルしました");
  }

  function handleReschedule() {
    setRescheduleOpen(false);
    setNewDate("");
    setNewTime("");
    toast.success("リスケジュールの依頼を送信しました");
  }

  if (!booking) {
    return (
      <div className="card flex flex-col items-center justify-center py-16">
        <Calendar className="h-10 w-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">予約が見つかりません</p>
        <p className="text-xs text-gray-400 mt-1">URLを確認してください</p>
      </div>
    );
  }

  const event = mockEventTypes.find((e) => e.id === booking.event_id);
  const currentStatus = bookingStatus ?? booking.status;
  const statusInfo = statusConfig[currentStatus];
  const StatusIcon = statusInfo.icon;
  const locCfg = locationConfig[event?.location_type || "online"];
  const LocationIcon = locCfg.icon;
  const eventCustomFields = mockCustomFields.filter((f) => f.event_id === booking.event_id);

  return (
    <div className="bg-white">
      {/* Header card */}
      <div className="px-6 py-5 border-b-[1px] border-gray-100">
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
      {currentStatus === "cancelled" && (
        <div className="p-6 pb-0">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm font-medium text-red-700">
                この予約はキャンセルされています
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details card */}
      <div className="px-6 py-5 divide-y divide-gray-100">
        {/* Date/Time */}
        <section className="py-4 first:pt-0 last:pb-0">
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
              <p className="text-sm">
                {event?.location_detail || locCfg.label}
              </p>
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
                （{event.scheduling_mode === "weekday" ? "曜日モード" : event.scheduling_mode === "fixed" ? "固定モード" : "プールモード"}）
              </span>
            )}
          </h2>
          {event?.scheduling_mode === "weekday" ? (() => {
            const dayIndex = (new Date(booking.start_time).getDay() + 6) % 7;
            const dayEntry = event.weekday_schedule?.find((e) => e.day_index === dayIndex);
            return dayEntry && dayEntry.member_ids.length > 0 ? (
              <div className="inline-flex flex-wrap gap-x-4 gap-y-2">
                {dayEntry.member_ids.map((userId) => {
                  const user = getUserById(userId);
                  return (
                    <div key={userId} className="flex flex-wrap items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                        {user?.full_name?.charAt(0) || "?"}
                      </div>
                      <p className="text-sm whitespace-nowrap">{user?.full_name || "不明"}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-300">担当者未設定</p>
            );
          })() : booking.assigned_members && booking.assigned_members.length > 0 ? (
            <div className="inline-flex flex-wrap gap-x-4 gap-y-2">
              {booking.assigned_members.map((am) => {
                const user = getUserById(am.user_id);
                const role = event?.scheduling_mode !== "fixed" ? mockRoles.find((r) => r.id === am.role_id) : undefined;
                return (
                  <div key={am.user_id} className="flex flex-wrap items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                      {user?.full_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm whitespace-nowrap">
                        {user?.full_name || "不明"}
                      </p>
                      {role && (
                        <p className="text-xs text-gray-400 mt-0.5">{role.name}</p>
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
        {booking.reminders && booking.reminders.length > 0 && (
          <section className="py-4">
            <h2 className="section-label">
              リマインド
            </h2>
            <div className="space-y-2">
              {booking.reminders.map((reminder, idx) => {
                const isSent = reminder.status === "sent";
                const isPending = reminder.status === "pending";
                const channelLabel =
                  { email: "メール", sms: "SMS", both: "メール + SMS" }[reminder.channel];
                const scheduledDate = new Date(reminder.scheduled_at).toLocaleString("ja-JP", {
                  year: 'numeric',
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={idx} className="flex items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span>{channelLabel}</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-xs text-gray-400">{scheduledDate}</span>
                    </div>
                    <span
                      className={cn(
                        "badge ml-3",
                        isSent
                          ? "badge-green"
                          : isPending
                            ? "badge badge-blue"
                            : "badge-gray"
                      )}
                    >
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
            <h2 className="section-label">
              フォームの回答
            </h2>
            <dl className="space-y-2">
              {eventCustomFields.map((field) => {
                const value = booking.custom_field_values?.[field.id];
                if (!value) return null;
                return (
                  <div key={field.id}>
                    <dt className="text-xs text-gray-400 mb-0.5">{field.label}</dt>
                    <dd className="text-sm break-all">
                      {field.type === "url" ? (
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 hover:underline">
                          {value}
                        </a>
                      ) : field.type === "multiline" ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{value}</p>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}
      </div>

      {/* Actions */}
      {currentStatus !== "cancelled" && (
        <div className="p-4 flex gap-2 border-t-[1px] border-gray-100">
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

      {/* Cancel confirm dialog */}
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="予約をキャンセルしますか？"
        description={`${booking.candidate_name} さんの予約をキャンセルします。この操作は取り消せません。`}
        confirmLabel="キャンセルする"
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
            <button onClick={() => { setRescheduleOpen(false); setNewDate(""); setNewTime(""); }} className="btn btn-ghost">
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
            <input
              type="date"
              className="input mt-1"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">新しい時刻</label>
            <input
              type="time"
              className="input mt-1"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
