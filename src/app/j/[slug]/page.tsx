"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getEventBySlug, mockUsers } from "@/lib/mock-data";
import { computeAvailableSlots } from "@/lib/scheduler";
import { mockCalendarEvents } from "@/lib/mock-data";
import type { TimeSlot, CustomField } from "@/types";
import { EventPageHeader } from "@/components/booking/EventPageHeader";

type BookingStep = "select-date" | "select-time" | "form" | "confirm" | "confirmed";

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const eventData = getEventBySlug(slug);

  const [step, setStep] = useState<BookingStep>("select-date");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({
    candidate_name: "",
    candidate_email: "",
    candidate_phone: "",
  });

  // Use current month as base
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Compute available slots
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

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const slot of availableSlots) {
      const date = new Date(slot.start).toISOString().split("T")[0];
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(slot);
    }
    return map;
  }, [availableSlots]);

  // Dates that have available slots
  const availableDates = useMemo(
    () => new Set(slotsByDate.keys()),
    [slotsByDate]
  );

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewMonth.year, viewMonth.month, 1);
    const lastDay = new Date(viewMonth.year, viewMonth.month + 1, 0);
    const startPad = firstDay.getDay();
    const days: (number | null)[] = [];

    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);

    return days;
  }, [viewMonth]);

  const monthLabel = new Date(
    viewMonth.year,
    viewMonth.month
  ).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });

  if (!eventData?.event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="card p-5 rounded-lg text-center">
          <p className="text-lg font-medium">
            イベントが見つかりません
          </p>
          <p className="mt-1 text-sm text-gray-500">
            URLを確認してもう一度お試しください
          </p>
        </div>
      </div>
    );
  }

  const event = eventData.event;
  const customFields = eventData.customFields;
  const companyName = mockUsers.find((u) => u.id === event.user_id)?.company_name;

  function handleDateSelect(day: number) {
    const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (availableDates.has(dateStr)) {
      setSelectedDate(dateStr);
      setSelectedSlot(null);
      setStep("select-time");
    }
  }

  function handleSlotSelect(slot: TimeSlot) {
    setSelectedSlot(slot);
    setStep("form");
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStep("confirm");
  }

  function handleBack() {
    if (step === "select-time") {
      setStep("select-date");
      setSelectedDate(null);
    } else if (step === "form") {
      setStep("select-time");
      setSelectedSlot(null);
    } else if (step === "confirm") {
      setStep("form");
    }
  }

  return (
    <>
      <EventPageHeader
        title={event.title}
        duration={event.duration}
        locationType={event.location_type}
        companyName={companyName}
      />
      <div className="flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg">

          {/* Step indicator */}
          {step !== "confirmed" && (
            <div className="p-6 flex items-center justify-center gap-3">
              {[
                { id: "select-date", label: "日付選択" },
                { id: "select-time", label: "時間選択" },
                { id: "form", label: "情報入力" },
              ].map((s, i) => {
                const stepOrder = ["select-date", "select-time", "form"];
                // "confirm" は "form" と同じ位置として扱う
                const effectiveStep = step === "confirm" ? "form" : step;
                const currentIndex = stepOrder.indexOf(effectiveStep);
                const thisIndex = stepOrder.indexOf(s.id);
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="flex flex-col justify-center items-center gap-1.5">
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                          thisIndex < currentIndex
                            ? "bg-primary-600 text-white"
                            : thisIndex === currentIndex
                              ? "bg-primary-100 text-primary-700 ring-2 ring-primary-600"
                              : "bg-gray-100 text-gray-400"
                        )}
                      >
                        {i + 1}
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          thisIndex <= currentIndex
                            ? "text-gray-700"
                            : "text-gray-400"
                        )}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < 2 && (
                      <div
                        className={cn(
                          "h-px w-8",
                          thisIndex < currentIndex
                            ? "bg-primary-600"
                            : "bg-gray-300"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Content */}
          <div className="card p-5 rounded-lg">
            {/* Step 1: Date Selection (Calendar) */}
            {step === "select-date" && (
              <div>
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
                  <h2 className="text-base font-semibold">
                    {monthLabel}
                  </h2>
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

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                    <div
                      key={d}
                      className="text-center text-xs font-medium text-gray-400 py-1"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, i) => {
                    if (day === null) {
                      return <div key={`pad-${i}`} />;
                    }
                    const dateStr = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const hasSlots = availableDates.has(dateStr);
                    const isWeekend =
                      new Date(
                        viewMonth.year,
                        viewMonth.month,
                        day
                      ).getDay() === 0 ||
                      new Date(
                        viewMonth.year,
                        viewMonth.month,
                        day
                      ).getDay() === 6;

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

                <p className="mt-4 text-center text-xs text-gray-400">
                  色がついた日付に空き枠があります
                </p>
              </div>
            )}

            {/* Step 2: Time Selection */}
            {step === "select-time" && selectedDate && (
              <div>
                <button
                  onClick={handleBack}
                  className="mb-5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  日付を変更
                </button>
                <h2 className="text-base font-semibold">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                    "ja-JP",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    }
                  )}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  ご希望の時間帯を選択してください
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {(slotsByDate.get(selectedDate) || []).map((slot) => {
                    const startTime = new Date(slot.start).toLocaleTimeString(
                      "ja-JP",
                      { hour: "2-digit", minute: "2-digit" }
                    );
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

            {/* Step 3: Form */}
            {step === "form" && selectedSlot && (
              <div>
                <button
                  onClick={handleBack}
                  className="mb-5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  時間を変更
                </button>

                {/* Selected slot summary */}
                <div className="mb-6 rounded-xl bg-primary-50 p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="text-sm font-semibold text-primary-900">
                        {new Date(selectedSlot.start).toLocaleDateString(
                          "ja-JP",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            weekday: "long",
                          }
                        )}
                      </p>
                      <p className="text-sm text-primary-700">
                        {new Date(selectedSlot.start).toLocaleTimeString(
                          "ja-JP",
                          { hour: "2-digit", minute: "2-digit" }
                        )}{" "}
                        -{" "}
                        {new Date(selectedSlot.end).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" "}({event.duration}分)
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Default fields */}
                  <div>
                    <label className="label">
                      お名前<span className="ml-1 rounded-[3px] px-1 text-[11px] bg-red-100 text-red-500">必須</span>
                    </label>
                    <input
                      type="text"
                      className="input mt-1"
                      required
                      value={formValues.candidate_name}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          candidate_name: e.target.value,
                        })
                      }
                      placeholder="山田 太郎"
                    />
                  </div>
                  <div>
                    <label className="label">
                      メールアドレス<span className="ml-1 rounded-[3px] px-1 text-[11px] bg-red-100 text-red-500">必須</span>
                    </label>
                    <input
                      type="email"
                      className="input mt-1"
                      required
                      value={formValues.candidate_email}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          candidate_email: e.target.value,
                        })
                      }
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="label">
                      電話番号<span className="ml-1 rounded-[3px] px-1 text-[11px] bg-red-100 text-red-500">必須</span>
                    </label>
                    <input
                      type="tel"
                      className="input mt-1"
                      required
                      value={formValues.candidate_phone}
                      onChange={(e) =>
                        setFormValues({
                          ...formValues,
                          candidate_phone: e.target.value,
                        })
                      }
                      placeholder="090-0000-0000"
                    />
                  </div>

                  {/* Custom fields */}
                  {customFields.map((field) => (
                    <div key={field.id}>
                      <label className="label">
                        {field.label}
                        {field.is_required && (
                          <span className="text-red-500"> *</span>
                        )}
                      </label>
                      {field.type === "multiline" ? (
                        <textarea
                          className="input mt-1"
                          rows={3}
                          required={field.is_required}
                          value={formValues[field.id] || ""}
                          onChange={(e) =>
                            setFormValues({
                              ...formValues,
                              [field.id]: e.target.value,
                            })
                          }
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          type={field.type}
                          className="input mt-1"
                          required={field.is_required}
                          value={formValues[field.id] || ""}
                          onChange={(e) =>
                            setFormValues({
                              ...formValues,
                              [field.id]: e.target.value,
                            })
                          }
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}

                  <button type="submit" className="btn btn-primary w-full mt-6">
                    入力内容を確認する
                  </button>
                </form>
              </div>
            )}

            {/* Step 4: 予約内容確認 */}
            {step === "confirm" && selectedSlot && (
              <div>
                <button
                  onClick={handleBack}
                  className="mb-5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  入力に戻る
                </button>
                <h2 className="text-base font-semibold mb-4">予約内容の確認</h2>

                {/* 選択日時 */}
                <div className="mb-4 rounded-xl bg-primary-50 p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-primary-900">
                        {new Date(selectedSlot.start).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        })}
                      </p>
                      <p className="text-sm text-primary-700">
                        {new Date(selectedSlot.start).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" "}〜{" "}
                        {new Date(selectedSlot.end).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" "}({event.duration}分)
                      </p>
                    </div>
                  </div>
                </div>

                {/* 入力内容 */}
                <div className="mb-6 rounded-xl bg-gray-50 p-4">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">お名前</dt>
                      <dd className="font-medium">{formValues.candidate_name}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">メールアドレス</dt>
                      <dd className="font-medium break-all">{formValues.candidate_email}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-500">電話番号</dt>
                      <dd className="font-medium">{formValues.candidate_phone}</dd>
                    </div>
                    {customFields.map((field) =>
                      formValues[field.id] ? (
                        <div key={field.id} className="flex justify-between gap-4">
                          <dt className="text-gray-500">{field.label}</dt>
                          <dd className="flex-1 font-medium text-right break-all">
                            {formValues[field.id]}
                          </dd>
                        </div>
                      ) : null
                    )}
                  </dl>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setStep("confirmed")}
                    className="btn btn-primary w-full"
                  >
                    予約を確定する
                  </button>
                  <button
                    onClick={handleBack}
                    className="btn btn-secondary w-full"
                  >
                    戻る
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: 予約完了 */}
            {step === "confirmed" && selectedSlot && (
              <>
                <div className="py-8 text-center">
                  <div className="mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold">
                    予約が確定しました
                  </h2>
                  <p className="flex mt-2 items-cnter justify-center text-sm text-gray-500 whitespace-nowrap">
                    <span className="font-medium truncate">
                      {formValues.candidate_email}
                    </span>{"に"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 whitespace-nowrap">確認メールを送信しました</p>
                  <p className="mt-1 text-xs text-gray-400">日程変更・キャンセルは確認メールのリンクから行えます</p>
                  <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-left">
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">イベント</dt>
                        <dd className="flex-1 font-medium text-right">
                          {event.title}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">日時</dt>
                        <dd className="flex-1 ont-medium text-right">
                          {new Date(selectedSlot.start).toLocaleDateString(
                            "ja-JP",
                            {
                              month: "long",
                              day: "numeric",
                              weekday: "short",
                            }
                          )}{" "}
                          {new Date(selectedSlot.start).toLocaleTimeString(
                            "ja-JP",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">場所</dt>
                        <dd className="flex-1 font-medium text-right">
                          {event.location_detail || "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </>
            )}
          </div>
          <p className="mt-4 py-4 flex items-center justify-center gap-2 w-full text-xs text-gray-400">
            Powered by
            <Image
              src="/common/logo.svg"
              alt="Pitasuke"
              width={80}
              height={40}
            />
          </p>
        </div>
      </div>
    </>
  );
}
