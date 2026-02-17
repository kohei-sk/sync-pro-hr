"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Users,
  Video,
  MapPin,
  Phone,
  Zap,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Step = "template" | "basic" | "team" | "confirm";

const templates = [
  {
    id: "technical",
    name: "技術面接",
    description: "エンジニア向けの技術面接テンプレート",
    duration: 60,
    mode: "pool" as const,
    icon: Zap,
    color: "#3b82f6",
  },
  {
    id: "final",
    name: "最終面接",
    description: "経営陣・責任者との最終面接",
    duration: 90,
    mode: "fixed" as const,
    icon: Lock,
    color: "#8b5cf6",
  },
  {
    id: "casual",
    name: "カジュアル面談",
    description: "気軽なカジュアル面談",
    duration: 30,
    mode: "fixed" as const,
    icon: Users,
    color: "#22c55e",
  },
  {
    id: "custom",
    name: "カスタム",
    description: "ゼロから設定を作成",
    duration: 60,
    mode: "pool" as const,
    icon: Clock,
    color: "#6b7280",
  },
];

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    duration: 60,
    buffer_before: 15,
    buffer_after: 15,
    location_type: "online" as "online" | "in-person" | "phone",
    location_detail: "",
    scheduling_mode: "pool" as "pool" | "fixed",
    color: "#3b82f6",
  });

  const steps: { id: Step; label: string }[] = [
    { id: "template", label: "テンプレート" },
    { id: "basic", label: "基本設定" },
    { id: "team", label: "チーム設定" },
    { id: "confirm", label: "確認" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  function handleTemplateSelect(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setFormData((prev) => ({
        ...prev,
        title: template.id === "custom" ? "" : template.name,
        duration: template.duration,
        scheduling_mode: template.mode,
        color: template.color,
      }));
    }
  }

  function handleNext() {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].id);
    }
  }

  function handleBack() {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].id);
    }
  }

  function handleCreate() {
    // In a real app, this would save to the database
    router.push("/dashboard/events");
  }

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/dashboard/events"
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            新規イベント作成
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            テンプレートを選択するか、ゼロから作成します
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
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
                  "text-sm font-medium",
                  i <= currentStepIndex ? "text-gray-900" : "text-gray-400"
                )}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-8",
                    i < currentStepIndex ? "bg-primary-600" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="card max-w-3xl">
        {/* Step 1: Template Selection */}
        {step === "template" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              テンプレートを選択
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              用途に合ったテンプレートを選んで素早く作成できます
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={cn(
                    "flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all",
                    selectedTemplate === template.id
                      ? "border-primary-600 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: template.color + "20" }}
                  >
                    <template.icon
                      className="h-5 w-5"
                      style={{ color: template.color }}
                    />
                  </div>
                  <h3 className="mt-3 font-semibold text-gray-900">
                    {template.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {template.description}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {template.duration}分
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {template.mode === "pool" ? "プール" : "固定"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Basic Settings */}
        {step === "basic" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">基本設定</h2>
            <p className="mt-1 text-sm text-gray-500">
              イベントの基本情報を入力してください
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <label className="label">イベント名</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      title: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  placeholder="例: エンジニア一次面接"
                />
              </div>
              <div>
                <label className="label">URL スラグ</label>
                <div className="mt-1 flex items-center rounded-2xl bg-gray-50 ring-1 ring-gray-300">
                  <span className="pl-4 text-sm text-gray-500">
                    /j/
                  </span>
                  <input
                    type="text"
                    className="flex-1 border-0 bg-transparent py-2.5 pr-4 text-sm text-gray-900 focus:ring-0"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    placeholder="engineer-first"
                  />
                </div>
              </div>
              <div>
                <label className="label">説明</label>
                <textarea
                  className="input mt-1"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="このイベントの説明を入力してください"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">所要時間（分）</label>
                  <input
                    type="number"
                    className="input mt-1"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: parseInt(e.target.value) || 30,
                      })
                    }
                    min={15}
                    step={15}
                  />
                </div>
                <div>
                  <label className="label">前バッファ（分）</label>
                  <input
                    type="number"
                    className="input mt-1"
                    value={formData.buffer_before}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        buffer_before: parseInt(e.target.value) || 0,
                      })
                    }
                    min={0}
                    step={5}
                  />
                </div>
                <div>
                  <label className="label">後バッファ（分）</label>
                  <input
                    type="number"
                    className="input mt-1"
                    value={formData.buffer_after}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        buffer_after: parseInt(e.target.value) || 0,
                      })
                    }
                    min={0}
                    step={5}
                  />
                </div>
              </div>
              <div>
                <label className="label">場所</label>
                <div className="mt-2 flex gap-3">
                  {[
                    { type: "online" as const, icon: Video, label: "オンライン" },
                    { type: "in-person" as const, icon: MapPin, label: "対面" },
                    { type: "phone" as const, icon: Phone, label: "電話" },
                  ].map((loc) => (
                    <button
                      key={loc.type}
                      onClick={() =>
                        setFormData({ ...formData, location_type: loc.type })
                      }
                      className={cn(
                        "flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium ring-1 transition-colors",
                        formData.location_type === loc.type
                          ? "bg-primary-50 text-primary-700 ring-primary-300"
                          : "text-gray-600 ring-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <loc.icon className="h-4 w-4" />
                      {loc.label}
                    </button>
                  ))}
                </div>
              </div>
              {formData.location_type && (
                <div>
                  <label className="label">場所の詳細</label>
                  <input
                    type="text"
                    className="input mt-1"
                    value={formData.location_detail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        location_detail: e.target.value,
                      })
                    }
                    placeholder={
                      formData.location_type === "online"
                        ? "Google Meet / Zoom URL"
                        : formData.location_type === "in-person"
                        ? "会議室名や住所"
                        : "電話番号"
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Team Settings */}
        {step === "team" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              チーム設定
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              面接に参加するメンバーの役割と配分を設定します
            </p>
            <div className="mt-6 space-y-5">
              <div>
                <label className="label">スケジューリングモード</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      setFormData({ ...formData, scheduling_mode: "fixed" })
                    }
                    className={cn(
                      "rounded-2xl border-2 p-4 text-left transition-all",
                      formData.scheduling_mode === "fixed"
                        ? "border-primary-600 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <Lock className="h-5 w-5 text-gray-600" />
                    <h4 className="mt-2 font-semibold text-gray-900">
                      固定モード
                    </h4>
                    <p className="mt-1 text-xs text-gray-500">
                      指定メンバー全員が空いている枠のみ表示
                    </p>
                  </button>
                  <button
                    onClick={() =>
                      setFormData({ ...formData, scheduling_mode: "pool" })
                    }
                    className={cn(
                      "rounded-2xl border-2 p-4 text-left transition-all",
                      formData.scheduling_mode === "pool"
                        ? "border-primary-600 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <Users className="h-5 w-5 text-gray-600" />
                    <h4 className="mt-2 font-semibold text-gray-900">
                      プールモード
                    </h4>
                    <p className="mt-1 text-xs text-gray-500">
                      役割ごとに必要人数を満たす枠を自動選出
                    </p>
                  </button>
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  {formData.scheduling_mode === "fixed"
                    ? "固定モードでは、全メンバーの空き時間が一致する枠のみが候補者に表示されます。少人数の面接に適しています。"
                    : "プールモードでは、役割ごとに必要人数を設定し、条件を満たす枠が自動で選出されます。大人数の面接パネルに適しています。"}
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center">
                <Users className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  メンバーの追加は、イベント作成後の詳細設定画面で行えます
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === "confirm" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              設定内容の確認
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              以下の内容でイベントを作成します
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">イベント名</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.title || "未入力"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">URL</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      /j/{formData.slug || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">所要時間</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.duration}分
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">バッファ</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      前{formData.buffer_before}分 / 後{formData.buffer_after}分
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">場所</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.location_type === "online"
                        ? "オンライン"
                        : formData.location_type === "in-person"
                        ? "対面"
                        : "電話"}
                      {formData.location_detail &&
                        ` (${formData.location_detail})`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">モード</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.scheduling_mode === "fixed"
                        ? "固定モード"
                        : "プールモード"}
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
            onClick={handleBack}
            className={cn(
              "btn-secondary",
              currentStepIndex === 0 && "invisible"
            )}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </button>
          {step === "confirm" ? (
            <button onClick={handleCreate} className="btn-primary">
              イベントを作成
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={step === "template" && !selectedTemplate}
              className="btn-primary"
            >
              次へ
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
