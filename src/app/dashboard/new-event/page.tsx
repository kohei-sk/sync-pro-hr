"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  Video,
  Phone,
  Folder,
  User,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { getEventTypes, subscribe } from "@/lib/event-store";
import { cn } from "@/lib/utils";

function useEventTypes() {
  return useSyncExternalStore(subscribe, getEventTypes, getEventTypes);
}

type Step = "select" | "details" | "confirm";

export default function NewEventPage() {
  const router = useRouter();
  const eventTypes = useEventTypes();
  const activeEventTypes = eventTypes.filter((e) => e.status === "active");

  const [step, setStep] = useState<Step>("select");
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState({
    candidate_name: "",
    candidate_email: "",
    date: "",
    time: "",
  });
  const [isCreated, setIsCreated] = useState(false);

  const selectedEventType = eventTypes.find(
    (e) => e.id === selectedEventTypeId
  );

  const steps: { id: Step; label: string }[] = [
    { id: "select", label: "イベントタイプ選択" },
    { id: "details", label: "候補者情報" },
    { id: "confirm", label: "確認" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  function handleCreate() {
    setIsCreated(true);
  }

  const locationLabel = (type: string) =>
    type === "online" ? "オンライン" : type === "in-person" ? "対面" : "電話";

  const LocationIcon = (type: string) =>
    type === "online" ? Video : type === "in-person" ? MapPin : Phone;

  if (isCreated && selectedEventType) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-gray-900">
          イベントを作成しました
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {formData.candidate_name}さんの「{selectedEventType.title}
          」が登録されました
        </p>
        <div className="mt-6 rounded-2xl bg-gray-50 p-5 text-sm">
          <dl className="space-y-2">
            <div className="flex justify-between gap-8">
              <dt className="text-gray-500">イベントタイプ</dt>
              <dd className="font-medium text-gray-900">
                {selectedEventType.title}
              </dd>
            </div>
            <div className="flex justify-between gap-8">
              <dt className="text-gray-500">候補者</dt>
              <dd className="font-medium text-gray-900">
                {formData.candidate_name}
              </dd>
            </div>
            <div className="flex justify-between gap-8">
              <dt className="text-gray-500">メール</dt>
              <dd className="font-medium text-gray-900">
                {formData.candidate_email}
              </dd>
            </div>
            <div className="flex justify-between gap-8">
              <dt className="text-gray-500">日時</dt>
              <dd className="font-medium text-gray-900">
                {formData.date} {formData.time}
              </dd>
            </div>
          </dl>
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard/bookings" className="btn-secondary">
            予約一覧を見る
          </Link>
          <button
            onClick={() => {
              setIsCreated(false);
              setStep("select");
              setSelectedEventTypeId(null);
              setFormData({
                candidate_name: "",
                candidate_email: "",
                date: "",
                time: "",
              });
            }}
            className="btn-primary"
          >
            続けて作成
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            イベント作成
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            イベントタイプを選択して新しい面接・面談を作成します
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-3.5">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  i < currentStepIndex
                    ? "bg-primary-600 text-white"
                    : i === currentStepIndex
                      ? "bg-primary-100 text-primary-700 ring-2 ring-primary-600"
                      : "bg-gray-100 text-gray-400"
                )}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-semibold",
                  i <= currentStepIndex ? "text-gray-900" : "text-gray-400"
                )}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-8",
                    i < currentStepIndex ? "bg-primary-600" : "bg-gray-300"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="card max-w-3xl">
        {/* Step 1: Select Event Type */}
        {step === "select" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              イベントタイプを選択
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              作成するイベントのタイプを選んでください
            </p>

            {activeEventTypes.length === 0 ? (
              <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-center">
                <Folder className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-3 text-sm font-medium text-gray-900">
                  公開中のイベントタイプがありません
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  先にイベントタイプを作成して公開してください
                </p>
                <Link
                  href="/dashboard/events/new"
                  className="btn-primary mt-4 inline-flex"
                >
                  イベントタイプを作成
                </Link>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {activeEventTypes.map((event) => {
                  const LocIcon = LocationIcon(event.location_type);
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEventTypeId(event.id)}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all",
                        selectedEventTypeId === event.id
                          ? "border-primary-600 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: (event.color || "#0071c1") + "20",
                        }}
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: event.color || "#0071c1",
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="mt-0.5 text-sm text-gray-500 truncate">
                            {event.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {event.duration}分
                          </span>
                          <span className="flex items-center gap-1">
                            <LocIcon className="h-3.5 w-3.5" />
                            {locationLabel(event.location_type)}
                          </span>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 shrink-0 rounded-full border-2",
                          selectedEventTypeId === event.id
                            ? "border-primary-600 bg-primary-600"
                            : "border-gray-300"
                        )}
                      >
                        {selectedEventTypeId === event.id && (
                          <svg
                            className="h-full w-full text-white"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Candidate Details */}
        {step === "details" && selectedEventType && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">候補者情報</h2>
            <p className="mt-1 text-sm text-gray-500">
              面接・面談の候補者情報と希望日時を入力してください
            </p>

            <div className="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  backgroundColor:
                    (selectedEventType.color || "#0071c1") + "20",
                }}
              >
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: selectedEventType.color || "#0071c1",
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedEventType.title}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedEventType.duration}分 ·{" "}
                  {locationLabel(selectedEventType.location_type)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="label flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  候補者名
                </label>
                <input
                  type="text"
                  className="input mt-1"
                  value={formData.candidate_name}
                  onChange={(e) =>
                    setFormData({ ...formData, candidate_name: e.target.value })
                  }
                  placeholder="例: 山田 太郎"
                />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  メールアドレス
                </label>
                <input
                  type="email"
                  className="input mt-1"
                  value={formData.candidate_email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      candidate_email: e.target.value,
                    })
                  }
                  placeholder="例: yamada@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Folder className="h-3.5 w-3.5 text-gray-400" />
                    希望日
                  </label>
                  <input
                    type="date"
                    className="input mt-1"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    希望時間
                  </label>
                  <input
                    type="time"
                    className="input mt-1"
                    value={formData.time}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === "confirm" && selectedEventType && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              内容を確認
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              以下の内容でイベントを作成します
            </p>
            <div className="mt-6">
              <div className="rounded-2xl bg-gray-50 p-4">
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">イベントタイプ</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedEventType.title}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">所要時間</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {selectedEventType.duration}分
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">場所</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {locationLabel(selectedEventType.location_type)}
                      {selectedEventType.location_detail &&
                        ` (${selectedEventType.location_detail})`}
                    </dd>
                  </div>
                  <div className="border-t border-gray-200 pt-3" />
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">候補者名</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.candidate_name || "未入力"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">メール</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.candidate_email || "未入力"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">希望日時</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.date && formData.time
                        ? `${formData.date} ${formData.time}`
                        : "未入力"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
          <button
            onClick={() => {
              if (step === "details") setStep("select");
              else if (step === "confirm") setStep("details");
            }}
            className={cn("btn-secondary", step === "select" && "invisible")}
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          {step === "confirm" ? (
            <button onClick={handleCreate} className="btn-primary">
              イベントを作成
            </button>
          ) : (
            <button
              onClick={() => {
                if (step === "select") setStep("details");
                else if (step === "details") setStep("confirm");
              }}
              disabled={
                (step === "select" && !selectedEventTypeId) ||
                (step === "details" &&
                  (!formData.candidate_name || !formData.candidate_email))
              }
              className="btn-primary"
            >
              次へ
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
