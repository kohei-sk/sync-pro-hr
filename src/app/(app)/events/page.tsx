"use client";

import { Suspense } from "react";
import { useSyncExternalStore, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Copy,
  Check,
  Clock,
  MapPin,
  Users,
  Edit,
  Phone,
  Video,
  Mail,
  MessageSquare,
  Ban,
  FileText,
} from "lucide-react";
import {
  mockRoles,
  mockMembers,
  mockUsers,
  mockExclusionRules,
  mockCustomFields,
} from "@/lib/mock-data";
import { getEventTypes, subscribe } from "@/lib/event-store";
import { useToast } from "@/components/ui/Toast";
import { Drawer } from "@/components/ui/Drawer";
import { cn } from "@/lib/utils";
import type { EventType, ExclusionRule, CustomField } from "@/types";

function useEventTypes() {
  return useSyncExternalStore(subscribe, getEventTypes, getEventTypes);
}

// ============================================================
// Helper components
// ============================================================

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="section-label">{title}</h3>
      {children}
    </div>
  );
}

function DrawerRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <dt className="w-32 shrink-0 text-gray-400">{label}</dt>
      <dd className="flex flex-wrap items-center gap-1 text-gray-700">
        {children}
      </dd>
    </div>
  );
}

// ============================================================
// EventCard
// ============================================================

function EventCard({
  event,
  memberCount,
  isCopied,
  onCardClick,
  onCopyLink,
}: {
  event: EventType;
  memberCount: number;
  isCopied: boolean;
  onCardClick: () => void;
  onCopyLink: () => void;
}) {
  return (
    <div
      className="card card-clickable flex items-stretch gap-0 p-0 overflow-hidden hover:shadow-md transition-shadow"
      onClick={onCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardClick();
        }
      }}
    >
      {/* 左カラーバー */}
      <div
        className="w-1 shrink-0"
        style={{ backgroundColor: event.color || "#0071c1" }}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 min-w-0 px-5 py-4">
        {/* タイトル行 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-gray-900 leading-snug">
            {event.title}
          </span>
          <span
            className={cn(
              "badge",
              event.status === "active"
                ? "badge-green"
                : event.status === "draft"
                  ? "badge-gray"
                  : "badge-red"
            )}
          >
            {event.status === "active"
              ? "公開中"
              : event.status === "draft"
                ? "非公開"
                : "アーカイブ"}
          </span>
        </div>

        {/* 説明 */}
        {event.description && (
          <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-1">
            {event.description}
          </p>
        )}

        {/* メタデータ行 */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
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
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {memberCount}人
          </span>
        </div>

        {/* アクション行 (クリックの伝播を停止) */}
        <div
          className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onCopyLink}
            className="btn btn-emphasis btn-size-s"
          >
            {isCopied ? (
              <>
                <Check className="h-3 w-3" />
                コピーしました
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                リンクをコピー
              </>
            )}
          </button>
          <Link
            href={`/events/${event.id}`}
            className="btn btn-ghost btn-size-s ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Edit className="h-3 w-3" />
            編集
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EventDrawerContent
// ============================================================

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const EXCLUSION_TYPE_LABELS: Record<ExclusionRule["type"], string> = {
  "all-day": "終日",
  "time-range": "時間帯",
};

const FIELD_TYPE_LABELS: Record<CustomField["type"], string> = {
  text: "テキスト",
  email: "メール",
  tel: "電話番号",
  multiline: "複数行テキスト",
  url: "URL",
  file: "ファイル",
};

function EventDrawerContent({ event }: { event: EventType }) {
  const eventRoles = mockRoles.filter((r) => r.event_id === event.id);
  const roleIds = eventRoles.map((r) => r.id);
  const eventMembers = mockMembers.filter((m) => roleIds.includes(m.role_id));
  const exclusionRules = mockExclusionRules.filter(
    (r) => r.event_id === event.id
  );
  const customFields = mockCustomFields.filter(
    (f) => f.event_id === event.id
  );

  return (
    <div className="space-y-6">
      {/* 基本設定 */}
      <DrawerSection title="基本設定">
        <dl className="space-y-2.5">
          <DrawerRow label="ステータス">
            <span
              className={cn(
                "badge",
                event.status === "active"
                  ? "badge-green"
                  : event.status === "draft"
                    ? "badge-gray"
                    : "badge-red"
              )}
            >
              {event.status === "active"
                ? "公開中"
                : event.status === "draft"
                  ? "非公開"
                  : "アーカイブ"}
            </span>
          </DrawerRow>
          <DrawerRow label="所要時間">
            {event.duration}分
            {(event.buffer_before > 0 || event.buffer_after > 0) && (
              <span className="text-xs text-gray-400">
                （前 {event.buffer_before}分 / 後 {event.buffer_after}分）
              </span>
            )}
          </DrawerRow>
          <DrawerRow label="場所">
            <span className="flex items-center gap-1.5">
              {event.location_type === "online" ? (
                <Video className="h-3.5 w-3.5 text-gray-400" />
              ) : event.location_type === "phone" ? (
                <Phone className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
              )}
              {event.location_type === "online"
                ? "オンライン"
                : event.location_type === "in-person"
                  ? "対面"
                  : "電話"}
            </span>
            {event.location_detail && (
              <span className="w-full text-xs text-gray-500">
                {event.location_detail}
              </span>
            )}
          </DrawerRow>
          <DrawerRow label="スケジューリング">
            {event.scheduling_mode === "fixed" ? "固定モード" : "プールモード"}
          </DrawerRow>
          <DrawerRow label="説明">
            {event.description ? (
              <span className="leading-relaxed whitespace-pre-wrap">
                {event.description}
              </span>
            ) : (
              <span className="text-gray-400">説明なし</span>
            )}
          </DrawerRow>
        </dl>
      </DrawerSection>

      {/* メンバー */}
      <DrawerSection title="メンバー">
        {eventRoles.length === 0 ? (
          <p className="text-sm text-gray-400">メンバー未設定</p>
        ) : (
          <div className="space-y-4">
            {eventRoles.map((role) => {
              const roleMembers = eventMembers.filter(
                (m) => m.role_id === role.id
              );
              return (
                <div key={role.id}>
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    {role.name}
                    <span className="ml-1 font-normal text-gray-400">
                      （必要: {role.required_count}人）
                    </span>
                  </p>
                  {roleMembers.length === 0 ? (
                    <p className="text-xs text-gray-400 pl-2">未割当</p>
                  ) : (
                    <ul className="space-y-1.5 pl-2">
                      {roleMembers.map((member) => {
                        const user = mockUsers.find(
                          (u) => u.id === member.user_id
                        );
                        return (
                          <li
                            key={member.id}
                            className="flex items-center gap-2"
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                              {user?.full_name.charAt(0) ?? "?"}
                            </div>
                            <span className="text-sm text-gray-700">
                              {user?.full_name ?? "Unknown"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DrawerSection>

      {/* 除外ルール */}
      <DrawerSection title="除外ルール">
        {exclusionRules.length === 0 ? (
          <p className="text-sm text-gray-400">除外ルール未設定</p>
        ) : (
          <ul className="space-y-2">
            {exclusionRules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <Ban className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {EXCLUSION_TYPE_LABELS[rule.type]}
                    {rule.day_of_week !== undefined &&
                      `　${DAY_NAMES[rule.day_of_week]}曜日`}
                    {rule.start_time &&
                      rule.end_time &&
                      `　${rule.start_time} – ${rule.end_time}`}
                    {rule.recurring && "　（繰り返し）"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>

      {/* フォーム */}
      <DrawerSection title="フォーム">
        {customFields.length === 0 ? (
          <p className="text-sm text-gray-400">フォーム未設定</p>
        ) : (
          <ul className="space-y-2">
            {customFields.map((field) => (
              <li
                key={field.id}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    {field.label}
                    {field.is_required && (
                      <span className="ml-1 text-red-500 text-xs">必須</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {FIELD_TYPE_LABELS[field.type]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>

      {/* リマインド */}
      <DrawerSection title="リマインド">
        {!event.reminder_settings || event.reminder_settings.length === 0 ? (
          <p className="text-sm text-gray-400">リマインド未設定</p>
        ) : (
          <ul className="space-y-2">
            {event.reminder_settings.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                {r.channel === "sms" ? (
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                ) : (
                  <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                )}
                <span>
                  {{ email: "メール", sms: "SMS", both: "メール + SMS" }[
                    r.channel
                  ]}
                  　{r.timing.value}
                  {r.timing.unit === "hours" ? "時間" : "日"}前
                </span>
                {!r.is_enabled && (
                  <span className="badge badge-gray ml-auto">無効</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>
    </div>
  );
}

// ============================================================
// DrawerFooter
// ============================================================

function DrawerFooter({
  event,
  onCopy,
  isCopied,
}: {
  event: EventType;
  onCopy: () => void;
  isCopied: boolean;
}) {
  return (
    <>
      <button onClick={onCopy} className="btn btn-emphasis btn-size-s">
        {isCopied ? (
          <>
            <Check className="h-3 w-3" />
            コピーしました
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            リンクをコピー
          </>
        )}
      </button>
      <Link
        href={`/events/${event.id}`}
        className="btn btn-secondary btn-size-s"
      >
        <Edit className="h-3 w-3" />
        編集
      </Link>
    </>
  );
}

// ============================================================
// EventsContent (Client Component)
// ============================================================

function EventsContent() {
  const eventTypes = useEventTypes();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const selectedEventId = searchParams.get("id");
  const selectedEvent = selectedEventId
    ? (eventTypes.find((e) => e.id === selectedEventId) ?? null)
    : null;

  function openDrawer(eventId: string) {
    router.push(`/events?id=${eventId}`, { scroll: false });
  }

  function closeDrawer() {
    router.push("/events", { scroll: false });
  }

  function handleCopyLink(id: string, slug: string) {
    const url = `${window.location.origin}/j/${slug}`;
    const doCopy = () => {
      setCopiedEventId(id);
      toast.success("リンクをコピーしました");
      setTimeout(() => setCopiedEventId(null), 2000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(doCopy).catch(() => {
        // フォールバック: execCommand
        const el = document.createElement("textarea");
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        doCopy();
      });
    } else {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      doCopy();
    }
  }

  return (
    <div>
      <header className="header">
        <div className="header-col">
          <h1 className="header-title">イベント</h1>
          <p className="header-sub-title">
            面接や面談のイベントを管理します
          </p>
        </div>
        <Link href="/events/new" className="btn btn-primary">
          <Plus className="h-4 w-4" />
          新規イベント作成
        </Link>
      </header>

      {eventTypes.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Plus className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            イベントがありません
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            新しいイベントを作成して面接日程の調整を始めましょう
          </p>
          <Link href="/events/new" className="btn btn-primary mt-4">
            <Plus className="h-4 w-4" />
            新規イベント作成
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {eventTypes.map((event) => {
            const eventRoles = mockRoles.filter(
              (r) => r.event_id === event.id
            );
            const roleIds = eventRoles.map((r) => r.id);
            const memberCount = mockMembers.filter((m) =>
              roleIds.includes(m.role_id)
            ).length;

            return (
              <EventCard
                key={event.id}
                event={event}
                memberCount={memberCount}
                isCopied={copiedEventId === event.id}
                onCardClick={() => openDrawer(event.id)}
                onCopyLink={() => handleCopyLink(event.id, event.slug)}
              />
            );
          })}
        </div>
      )}

      {/* 詳細ドロワー */}
      <Drawer
        open={selectedEvent !== null}
        onClose={closeDrawer}
        title={selectedEvent?.title ?? ""}
        footer={
          selectedEvent ? (
            <DrawerFooter
              event={selectedEvent}
              onCopy={() =>
                handleCopyLink(selectedEvent.id, selectedEvent.slug)
              }
              isCopied={copiedEventId === selectedEvent.id}
            />
          ) : undefined
        }
      >
        {selectedEvent && <EventDrawerContent event={selectedEvent} />}
      </Drawer>
    </div>
  );
}

// ============================================================
// EventsPage (default export — Suspense shell)
// ============================================================

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <div className="header">
            <div className="header-col">
              <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200" />
              <div className="h-4 w-48 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="card h-24 animate-pulse bg-gray-100"
              />
            ))}
          </div>
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
