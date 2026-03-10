"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  CircleCheck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getEventBySlug, getBookingById, mockUsers, mockCalendarEvents } from "@/lib/mock-data";
import { computeAvailableSlots } from "@/lib/scheduler";
import type { TimeSlot } from "@/types";
import { EventPageHeader } from "@/components/booking/EventPageHeader";

type ManageStep =
  | "detail"
  | "reschedule-date"
  | "reschedule-time"
  | "reschedule-complete"
  | "cancel-confirm"
  | "cancel-complete";

export default function ManageBookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const bookingId = params.bookingId as string;

  const eventData = getEventBySlug(slug);
  const booking = getBookingById(bookingId);

  const [step, setStep] = useState<ManageStep>("detail");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const availableSlots = useMemo(() => {
    if (!eventData?.event) return [];

    const startDate = new Date(viewMonth.year, viewMonth.month, 1);
    const endDate = new Date(viewMonth.year, viewMonth.month + 1, 0);

    const result = computeAvailableSlots({
      event: eventData.event,
      roles: eventData.roles,
      members: eventData.members,
      exclusion_rules: eventData.exclusionRules,
      calendar_events: mockCalendarEvents,
      date_range: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      working_hours: { start: "09:00", end: "18:00" },
    });

    return result.available_slots;
  }, [eventData, viewMonth]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const slot of availableSlots) {
      const date = new Date(slot.start).toISOString().split("T")[0];
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(slot);
    }
    return map;
  }, [availableSlots]);

  const availableDates = useMemo(() => new Set(slotsByDate.keys()), [slotsByDate]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewMonth.year, viewMonth.month, 1);
    const lastDay = new Date(viewMonth.year, viewMonth.month + 1, 0);
    const startPad = firstDay.getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    return days;
  }, [viewMonth]);

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });

  // Not found states
  if (!eventData?.event || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="card p-5 rounded-lg text-center">
          <p className="text-lg font-medium">予約が見つかりません</p>
          <p className="mt-1 text-sm text-gray-500">URLを確認してもう一度お試しください</p>
        </div>
      </div>
    );
  }

  const event = eventData.event;
  const companyName = mockUsers.find((u) => u.id === event.user_id)?.company_name;

  // Booking is already cancelled
  if (booking.status === "cancelled" && step === "detail") {
    return (
      <>
        <EventPageHeader
          title={event.title}
          duration={event.duration}
          locationType={event.location_type}
          companyName={companyName}
        />
        <div className="flex items-center justify-center bg-gray-50 p-4 min-h-[calc(100vh-60px)]">
          <div className="w-full max-w-lg">
            <div className="card p-5 rounded-lg text-center">
              <XCircle className="h-10 w-10 text-gray-400 mx-auto" />
              <p className="mt-3 text-base font-semibold text-gray-700">この予約はキャンセル済みです</p>
              <p className="mt-1 text-sm text-gray-400">変更・キャンセルの操作はできません</p>
            </div>
            <p className="mt-4 py-4 flex items-center justify-center gap-2 w-full text-xs text-gray-400">
              Powered by
              <Image src="/common/logo.svg" alt="Pitasuke" width={80} height={40} />
            </p>
          </div>
        </div>
      </>
    );
  }

  function handleDateSelect(day: number) {
    const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (availableDates.has(dateStr)) {
      setSelectedDate(dateStr);
      setSelectedSlot(null);
      setStep("reschedule-time");
    }
  }

  function handleSlotSelect(slot: TimeSlot) {
    setSelectedSlot(slot);
    setStep("reschedule-complete");
  }

  return (
    <>
      <EventPageHeader
        title={event.title}
        duration={event.duration}
        locationType={event.location_type}
        companyName={companyName}
      />
      <div className="flex items-center justify-center bg-gray-50 px-4 py-6">
        <div className="w-full max-w-lg">

          <div className="card p-5 rounded-lg">

            {/* 予約詳細 + アクションボタン */}
            {step === "detail" && (
              <div>
                <h2 className="text-base font-semibold mb-4">予約の変更・キャンセル</h2>

                {/* Current booking info */}
                <div className="rounded-xl bg-gray-50 p-4 mb-6">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">お名前</dt>
                      <dd className="font-medium">{booking.candidate_name}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">イベント</dt>
                      <dd className="flex-1 font-medium text-right">{event.title}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">日時</dt>
                      <dd className="flex-1 font-medium text-right">
                        {new Date(booking.start_time).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}{" "}
                        {new Date(booking.start_time).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" "}〜{" "}
                        {new Date(booking.end_time).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </dd>
                    </div>
                    {event.location_detail && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">場所</dt>
                        <dd className="flex-1 font-medium text-right">{event.location_detail}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => setStep("reschedule-date")}
                    className="btn btn-primary w-full"
                  >
                    <Calendar className="h-4 w-4" />
                    日程を変更する
                  </button>
                  <button
                    onClick={() => setStep("cancel-confirm")}
                    className="btn btn-danger w-full"
                  >
                    <XCircle className="h-4 w-4" />
                    予約をキャンセルする
                  </button>
                </div>
              </div>
            )}

            {/* 日付選択 (カレンダー) */}
            {step === "reschedule-date" && (
              <div>
                <button
                  onClick={() => setStep("detail")}
                  className="mb-5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  戻る
                </button>
                <h2 className="text-base font-semibold mb-4">新しい日程を選択</h2>

                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() =>
                      setViewMonth((prev) => {
                        const d = new Date(prev.year, prev.month - 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })
                    }
                    className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-base font-semibold">{monthLabel}</h3>
                  <button
                    onClick={() =>
                      setViewMonth((prev) => {
                        const d = new Date(prev.year, prev.month + 1);
                        return { year: d.getFullYear(), month: d.getMonth() };
                      })
                    }
                    className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-2">
                  {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => {
                    if (day === null) return <div key={`pad-${i}`} />;
                    const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const hasSlots = availableDates.has(dateStr);
                    const isWeekend =
                      new Date(viewMonth.year, viewMonth.month, day).getDay() === 0 ||
                      new Date(viewMonth.year, viewMonth.month, day).getDay() === 6;
                    return (
                      <button
                        key={day}
                        onClick={() => handleDateSelect(day)}
                        disabled={!hasSlots}
                        className={cn(
                          "flex h-10 w-full items-center justify-center rounded-md text-sm font-medium transition-colors",
                          hasSlots
                            ? "bg-primary-50 text-primary-700 hover:bg-primary-100"
                            : isWeekend
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-gray-400 cursor-not-allowed"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 text-center text-xs text-gray-400">色がついた日付に空き枠があります</p>
              </div>
            )}

            {/* 時間帯選択 */}
            {step === "reschedule-time" && selectedDate && (
              <div>
                <button
                  onClick={() => setStep("reschedule-date")}
                  className="mb-5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  日付を変更
                </button>
                <h2 className="text-base font-semibold">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  })}
                </h2>
                <p className="mt-1 text-sm text-gray-500">ご希望の時間帯を選択してください</p>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {(slotsByDate.get(selectedDate) || []).map((slot) => {
                    const startTime = new Date(slot.start).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <button
                        key={slot.start}
                        onClick={() => handleSlotSelect(slot)}
                        className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700 transition-all hover:bg-primary-100 hover:shadow-sm"
                      >
                        {startTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 変更完了 */}
            {step === "reschedule-complete" && selectedSlot && (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                <h2 className="mt-4 text-xl font-semibold">変更リクエストを送信しました</h2>
                <p className="mt-2 text-sm text-gray-500">
                  担当者が確認後、新しい日程でご案内いたします
                </p>
                <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-left">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">希望日時</dt>
                      <dd className="flex-1 font-medium text-right">
                        {new Date(selectedSlot.start).toLocaleDateString("ja-JP", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}{" "}
                        {new Date(selectedSlot.start).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">イベント</dt>
                      <dd className="flex-1 font-medium text-right">{event.title}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* キャンセル確認 */}
            {step === "cancel-confirm" && (
              <div>
                <button
                  onClick={() => setStep("detail")}
                  className="mb-5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  戻る
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                  <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
                  <h2 className="text-base font-semibold">予約をキャンセルしますか？</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    以下の予約をキャンセルします。<br />この操作は取り消せません。
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 mb-6">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">イベント</dt>
                      <dd className="flex-1 font-medium text-right">{event.title}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">日時</dt>
                      <dd className="flex-1 font-medium text-right">
                        {new Date(booking.start_time).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}{" "}
                        {new Date(booking.start_time).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setStep("cancel-complete")}
                    className="btn btn-danger w-full"
                  >
                    予約をキャンセルする
                  </button>
                  <button
                    onClick={() => setStep("detail")}
                    className="btn btn-secondary w-full"
                  >
                    戻る
                  </button>
                </div>
              </div>
            )}

            {/* キャンセル完了 */}
            {step === "cancel-complete" && (
              <div className="py-8 text-center">
                <CircleCheck className="h-12 w-12 text-green-600 mx-auto" />
                <h2 className="mt-4 text-xl font-semibold">予約をキャンセルしました</h2>
                <p className="mt-2 text-sm text-gray-500">
                  キャンセルの確認メールをお送りしました
                </p>
                <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-left">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">イベント</dt>
                      <dd className="flex-1 font-medium text-right">{event.title}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">日時</dt>
                      <dd className="flex-1 font-medium text-right">
                        {new Date(booking.start_time).toLocaleDateString("ja-JP", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}{" "}
                        {new Date(booking.start_time).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

          </div>

          <p className="mt-4 py-4 flex items-center justify-center gap-2 w-full text-xs text-gray-400">
            Powered by
            <Image src="/common/logo.svg" alt="Pitasuke" width={80} height={40} />
          </p>
        </div>
      </div>
    </>
  );
}
