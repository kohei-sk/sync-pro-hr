"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Users,
  ShieldOff,
  FileText,
  ExternalLink,
  Clock,
  MapPin,
  Plus,
  Trash2,
  GripVertical,
  Lock,
  Globe,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mockEventTypes,
  mockRoles,
  mockMembers,
  mockExclusionRules,
  mockCustomFields,
  mockUsers,
} from "@/lib/mock-data";
import { deleteEventType } from "@/lib/event-store";
import type {
  EventRole,
  EventMember,
  ExclusionRule,
  CustomField,
} from "@/types";

type TabId = "basic" | "team" | "exclusions" | "form";

const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: "basic", label: "基本設定", icon: Settings },
  { id: "team", label: "チーム", icon: Users },
  { id: "exclusions", label: "除外ルール", icon: ShieldOff },
  { id: "form", label: "フォーム", icon: FileText },
];

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const [activeTab, setActiveTab] = useState<TabId>("basic");

  const event = mockEventTypes.find((e) => e.id === eventId);
  const roles = mockRoles.filter((r) => r.event_id === eventId);
  const roleIds = roles.map((r) => r.id);
  const members = mockMembers.filter((m) => roleIds.includes(m.role_id));
  const exclusionRules = mockExclusionRules.filter(
    (r) => r.event_id === eventId
  );
  const customFields = mockCustomFields.filter(
    (f) => f.event_id === eventId
  );

  function handleDelete() {
    if (window.confirm(`「${event!.title}」を削除してもよろしいですか？`)) {
      deleteEventType(eventId);
      router.push("/dashboard/events");
    }
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">イベントが見つかりません</p>
        <Link href="/dashboard/events" className="btn-primary mt-4 inline-block">
          イベント一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-8">
      {/* Left: Settings */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/dashboard/events"
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: event.color }}
              />
              <h1 className="text-2xl font-bold text-gray-900">
                {event.title}
              </h1>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  event.status === "active"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {event.status === "active" ? "公開中" : "下書き"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{event.description}</p>
          </div>
          <Link
            href={`/j/${event.slug}`}
            className="btn-secondary text-sm"
          >
            <ExternalLink className="mr-1.5 h-4 w-4" />
            プレビュー
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            削除
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl bg-gray-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="card">
          {activeTab === "basic" && (
            <BasicTab event={event} />
          )}
          {activeTab === "team" && (
            <TeamTab roles={roles} members={members} mode={event.scheduling_mode} />
          )}
          {activeTab === "exclusions" && (
            <ExclusionsTab rules={exclusionRules} />
          )}
          {activeTab === "form" && (
            <FormTab fields={customFields} />
          )}
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="hidden w-80 shrink-0 xl:block">
        <div className="sticky top-0">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
            ライブプレビュー
          </h3>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: (event.color || "#3b82f6") + "20" }}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: event.color }}
                />
              </div>
              <h4 className="mt-3 font-semibold text-gray-900">
                {event.title}
              </h4>
              <div className="mt-2 flex items-center justify-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {event.duration}分
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location_type === "online"
                    ? "オンライン"
                    : event.location_type === "in-person"
                    ? "対面"
                    : "電話"}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {["月", "火", "水"].map((day, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2"
                >
                  <span className="text-xs font-medium text-gray-700">
                    2月{18 + i}日({day})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {["10:00", "11:00", "14:00", "16:00"]
                      .slice(0, 3 - i)
                      .map((time) => (
                        <span
                          key={time}
                          className="rounded-lg bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700"
                        >
                          {time}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-center text-xs text-gray-400">
                候補者に表示されるプレビュー
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Tab Components ---

function BasicTab({ event }: { event: typeof mockEventTypes[0] }) {
  const [isPublic, setIsPublic] = useState(event.status === "active");

  return (
    <div className="space-y-5">
      <div>
        <label className="label">イベント名</label>
        <input type="text" className="input mt-1" defaultValue={event.title} />
      </div>
      <div>
        <label className="label">URL スラグ</label>
        <div className="mt-1 flex items-center rounded-2xl bg-gray-50 ring-1 ring-gray-300">
          <span className="pl-4 text-sm text-gray-500">/j/</span>
          <input
            type="text"
            className="flex-1 border-0 bg-transparent py-2.5 pr-4 text-sm text-gray-900 focus:ring-0"
            defaultValue={event.slug}
          />
        </div>
      </div>
      <div>
        <label className="label">説明</label>
        <textarea
          className="input mt-1"
          rows={3}
          defaultValue={event.description}
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">所要時間（分）</label>
          <input
            type="number"
            className="input mt-1"
            defaultValue={event.duration}
            min={15}
            step={15}
          />
        </div>
        <div>
          <label className="label">前バッファ（分）</label>
          <input
            type="number"
            className="input mt-1"
            defaultValue={event.buffer_before}
            min={0}
            step={5}
          />
        </div>
        <div>
          <label className="label">後バッファ（分）</label>
          <input
            type="number"
            className="input mt-1"
            defaultValue={event.buffer_after}
            min={0}
            step={5}
          />
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="label">公開設定</label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={() => setIsPublic(true)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
              isPublic
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Globe className={cn("h-5 w-5", isPublic ? "text-green-600" : "text-gray-400")} />
            <div>
              <p className={cn("font-semibold text-sm", isPublic ? "text-green-800" : "text-gray-700")}>公開</p>
              <p className="text-xs text-gray-500">候補者が予約できます</p>
            </div>
          </button>
          <button
            onClick={() => setIsPublic(false)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
              !isPublic
                ? "border-gray-500 bg-gray-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <EyeOff className={cn("h-5 w-5", !isPublic ? "text-gray-600" : "text-gray-400")} />
            <div>
              <p className={cn("font-semibold text-sm", !isPublic ? "text-gray-800" : "text-gray-700")}>非公開</p>
              <p className="text-xs text-gray-500">下書き状態で保存します</p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button className="btn-primary">変更を保存</button>
      </div>
    </div>
  );
}

function TeamTab({
  roles,
  members,
  mode: initialMode,
}: {
  roles: EventRole[];
  members: EventMember[];
  mode: string;
}) {
  const [mode, setMode] = useState(initialMode);

  return (
    <div>
      {/* Mode selector */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-1">チームメンバー</h3>
        <p className="text-sm text-gray-500 mb-4">スケジューリングモードとメンバーを管理します</p>
        <label className="label">スケジューリングモード</label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("fixed")}
            className={cn(
              "rounded-2xl border-2 p-4 text-left transition-all",
              mode === "fixed"
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Lock className={cn("h-5 w-5", mode === "fixed" ? "text-primary-600" : "text-gray-400")} />
            <h4 className="mt-2 font-semibold text-gray-900">固定モード</h4>
            <p className="mt-1 text-xs text-gray-500">
              指定メンバー全員が空いている枠のみ表示
            </p>
          </button>
          <button
            onClick={() => setMode("pool")}
            className={cn(
              "rounded-2xl border-2 p-4 text-left transition-all",
              mode === "pool"
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Users className={cn("h-5 w-5", mode === "pool" ? "text-primary-600" : "text-gray-400")} />
            <h4 className="mt-2 font-semibold text-gray-900">プールモード</h4>
            <p className="mt-1 text-xs text-gray-500">
              役割ごとに必要人数を満たす枠を自動選出
            </p>
          </button>
        </div>
      </div>

      {/* Roles and members */}
      {mode === "fixed" ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">メンバー</p>
            <button className="btn-secondary text-sm">
              <Plus className="mr-1.5 h-4 w-4" />
              メンバーを追加
            </button>
          </div>
          <div className="rounded-2xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-2">
              {roles.flatMap((role) =>
                members.filter((m) => m.role_id === role.id)
              ).map((member) => {
                const user = mockUsers.find((u) => u.id === member.user_id);
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-1.5"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                      {user?.full_name.charAt(0) || "?"}
                    </div>
                    <span className="text-sm text-gray-700">
                      {user?.full_name || "Unknown"}
                    </span>
                    <button className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              <button className="flex items-center gap-1 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600">
                <Plus className="h-3 w-3" />
                メンバー追加
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">役割とメンバー</p>
            <button className="btn-secondary text-sm">
              <Plus className="mr-1.5 h-4 w-4" />
              役割を追加
            </button>
          </div>
          <div className="space-y-4">
            {roles.map((role) => {
              const roleMembers = members.filter((m) => m.role_id === role.id);
              return (
                <div
                  key={role.id}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-gray-300" />
                      <div>
                        <span className="font-medium text-gray-900">
                          {role.name}
                        </span>
                        <span className="ml-2 text-sm text-gray-500">
                          (必要人数: {role.required_count}人)
                        </span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {roleMembers.map((member) => {
                      const user = mockUsers.find((u) => u.id === member.user_id);
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-1.5"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                            {user?.full_name.charAt(0) || "?"}
                          </div>
                          <span className="text-sm text-gray-700">
                            {user?.full_name || "Unknown"}
                          </span>
                          <button className="text-gray-400 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                    <button className="flex items-center gap-1 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600">
                      <Plus className="h-3 w-3" />
                      メンバー追加
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button className="btn-primary">変更を保存</button>
      </div>
    </div>
  );
}

function ExclusionsTab({ rules }: { rules: ExclusionRule[] }) {
  const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">除外ルール</h3>
          <p className="text-sm text-gray-500">
            特定の日時をスケジュール対象外にします
          </p>
        </div>
        <button className="btn-secondary text-sm">
          <Plus className="mr-1.5 h-4 w-4" />
          ルールを追加
        </button>
      </div>
      {rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <ShieldOff className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            除外ルールはまだ設定されていません
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 p-4"
            >
              <div>
                <p className="font-medium text-gray-900">{rule.name}</p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {rule.type === "all-day" ? "終日" : `${rule.start_time} - ${rule.end_time}`}
                  {rule.recurring && rule.day_of_week !== undefined && (
                    <span> · 毎週{daysOfWeek[rule.day_of_week]}曜日</span>
                  )}
                  {rule.recurring && rule.day_of_week === undefined && (
                    <span> · 毎日</span>
                  )}
                  {!rule.recurring && rule.specific_date && (
                    <span> · {rule.specific_date}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    rule.recurring
                      ? "bg-blue-50 text-blue-700"
                      : "bg-orange-50 text-orange-700"
                  )}
                >
                  {rule.recurring ? "繰り返し" : "1回限り"}
                </span>
                <button className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormTab({ fields }: { fields: CustomField[] }) {
  const fieldTypeLabels: Record<string, string> = {
    text: "テキスト",
    email: "メール",
    tel: "電話番号",
    multiline: "複数行テキスト",
    url: "URL",
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">カスタムフォーム項目</h3>
          <p className="text-sm text-gray-500">
            候補者に入力してもらう項目を設定します
          </p>
        </div>
        <button className="btn-secondary text-sm">
          <Plus className="mr-1.5 h-4 w-4" />
          項目を追加
        </button>
      </div>

      {/* Default fields (always shown) */}
      <div className="mb-4 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          デフォルト項目（変更不可）
        </p>
        {[
          { label: "お名前", type: "text", required: true },
          { label: "メールアドレス", type: "email", required: true },
        ].map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-gray-300" />
              <span className="text-sm font-medium text-gray-700">
                {field.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                {fieldTypeLabels[field.type]}
              </span>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                必須
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Custom fields */}
      {fields.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            カスタム項目
          </p>
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 cursor-grab text-gray-300" />
                <span className="text-sm font-medium text-gray-700">
                  {field.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {fieldTypeLabels[field.type] || field.type}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    field.is_required
                      ? "bg-red-50 text-red-600"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {field.is_required ? "必須" : "任意"}
                </span>
                <button className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {fields.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            カスタム項目はまだ追加されていません
          </p>
        </div>
      )}
    </div>
  );
}
