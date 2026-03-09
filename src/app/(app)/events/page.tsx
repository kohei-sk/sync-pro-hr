"use client";

import { Suspense } from "react";
import { useSyncExternalStore, useState, useRef, useEffect } from "react";
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
  Search,
  ChevronDown,
  Filter,
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
import { cn, copyToClipboard } from "@/lib/utils";
import { EventStatusBadge } from "@/components/ui/EventStatusBadge";
import { TAB_SCROLL_OFFSET, DAY_NAMES, EXCLUSION_TYPE_LABELS, FIELD_TYPE_LABELS, WEEKDAY_LABELS } from "@/lib/constants";
import type { EventType } from "@/types";

function useEventTypes() {
  return useSyncExternalStore(subscribe, getEventTypes, getEventTypes);
}

// ============================================================
// Helper components
// ============================================================

function DrawerSection({
  title,
  subTitle,
  children,
}: {
  title: string;
  subTitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-4">
      <h3 className="section-label">
        {title}
        {subTitle ? <span className="section-sub-label">（{subTitle}）</span> : ""}
      </h3>
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
    <div className="flex items-start gap-4">
      <dt className="min-w-[26px] leading-[1.3rem] text-xs font-semibold text-gray-600">{label}</dt>
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

      {/* メインコンテンツ */}
      <div className="flex flex-1 min-w-0 px-5 py-4 w-full flex-wrap gap-4 lg:gap-0">
        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex flex-1 items-center gap-4">
            {/* カラー */}
            <div
              className="flex h-7 w-7 min-w-7 items-center justify-center rounded-lg"
              style={{
                backgroundColor: (event.color || "#0071c1") + "14",
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: event.color || "#0071c1" }}
              />
            </div>
            <div className="flex flex-col">
              <div>
                {/* タイトル行 */}
                <div className="inline-flex items-center gap-2">
                  <span className="font-semibold text-sm leading-relaxed">
                    {event.title}
                  </span>
                  <EventStatusBadge status={event.status} />
                </div>
              </div>

              {/* 説明 */}
              {event.description && (
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>
          </div>

          {/* メタデータ行 */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 min-w-auto lg:min-w-[306px] lg:px-8 mt-4 mt-3 lg:mt-0">
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
              <span className="badge badge-neutral">
                {event.scheduling_mode === "fixed"
                  ? "固定"
                  : event.scheduling_mode === "pool"
                    ? "プール"
                    : "曜日"}
              </span>
            </span>
          </div>
        </div>

        {/* アクション行 (クリックの伝播を停止) */}
        <div
          className="flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* <Link
            href={`/events/${event.id}`}
            className="btn btn-ghost btn-size-s ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Edit className="h-3 w-3" />
            編集
          </Link> */}
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
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EventDrawerContent
// ============================================================


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
    <div className="space-y-4 divide-y divide-gray-100">
      {/* ボディーヘッダー */}
      <div className="flex flex-1 items-center gap-4">
        {/* カラー */}
        <div
          className="flex h-8 w-8 min-w-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: (event.color || "#0071c1") + "14",
          }}
        >
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: event.color || "#0071c1" }}
          />
        </div>
        <div className="flex flex-col">
          <div>
            {/* タイトル行 */}
            <div className="inline-flex items-center gap-2">
              <span className="font-semibold text-base leading-relaxed">
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
          </div>

          {/* 説明 */}
          {event.description && (
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              {event.description}
            </p>
          )}
        </div>
      </div>

      {/* 時間・場所 */}
      <div className="pt-4 space-y-2">
        <dl className="flex items-center gap-2.5 text-sm">
          <dt><Clock className="h-4 w-4 shrink-0 text-gray-400" /></dt>
          <dd>
            {event.duration}分
            {(event.buffer_before > 0 || event.buffer_after > 0) && (
              <span className="text-xs text-gray-400 pl-2">
                （前 {event.buffer_before}分 / 後 {event.buffer_after}分）
              </span>
            )}
          </dd>
        </dl>
        <dl className="flex items-center gap-2.5 text-sm">
          <dt>
            {event.location_type === "online" ? (
              <Video className="h-45 w-4 text-gray-400" />
            ) : event.location_type === "phone" ? (
              <Phone className="h-4 w-4 text-gray-400" />
            ) : (
              <MapPin className="h-4 w-4 text-gray-400" />
            )}
          </dt>
          <dd>
            {event.location_type === "online"
              ? "オンライン"
              : event.location_type === "in-person"
                ? "対面"
                : "電話"}
            {event.location_detail && (
              <span className="text-xs text-gray-400 pl-2">
                {event.location_detail}
              </span>
            )}
          </dd>
        </dl>
      </div>

      {/* 受付設定 */}
      {event.reception_settings && (
        <DrawerSection title="受付設定">
          <dl className="space-y-1.5 text-sm">
            <DrawerRow label="時間">
              {event.reception_settings.exclude_outside_hours ? "営業時間外は受け付けない" : "時間制限なし"}
            </DrawerRow>
            <DrawerRow label="曜日">
              {WEEKDAY_LABELS.filter((_, i) => event.reception_settings!.allowed_days[i]).join("・") || "なし"}
              <span className="ml-2">（{event.reception_settings.accept_holidays ? "祝日は受け付ける" : "祝日は受け付けない"}）</span>
            </DrawerRow>
          </dl>
        </DrawerSection>
      )}

      {/* メンバー */}
      <DrawerSection
        title="メンバー"
        subTitle={event.scheduling_mode === "weekday" ? "曜日モード" : event.scheduling_mode === "fixed" ? "固定モード" : "プールモード"}
      >
        {event.scheduling_mode === "weekday" ? (
          event.weekday_schedule && event.weekday_schedule.length > 0 ? (
            <div className="space-y-3">
              {event.weekday_schedule.map((entry) => {
                const label = WEEKDAY_LABELS[entry.day_index];
                return (
                  <div key={entry.day_index}>
                    <p className="text-xs font-semibold text-gray-600 mb-2">{label}曜日</p>
                    <ul className="inline-flex flex-wrap gap-x-4 gap-y-2">
                      {entry.member_ids.map((userId) => {
                        const user = mockUsers.find((u) => u.id === userId);
                        return (
                          <li key={userId} className="flex flex-wrap items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                              {user?.full_name.charAt(0) ?? "?"}
                            </div>
                            <span className="text-sm whitespace-nowrap">{user?.full_name ?? "不明"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-300">メンバー未設定</p>
          )
        ) : eventRoles.length === 0 ? (
          <p className="text-sm text-gray-300">メンバー未設定</p>
        ) : (
          <div className="space-y-4">
            {eventRoles.map((role) => {
              const roleMembers = eventMembers.filter(
                (m) => m.role_id === role.id
              );
              return (
                <div key={role.id}>
                  {event.scheduling_mode !== "fixed" &&
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      {role.name}
                      <span className="ml-1 font-normal text-gray-400">
                        （{role.required_count}人）
                      </span>
                    </p>
                  }
                  {roleMembers.length === 0 ? (
                    <p className="text-xs text-gray-400">役割未設定</p>
                  ) : (
                    <ul
                      className="inline-flex flex-wrap gap-x-4 gap-y-2">
                      {roleMembers.map((member) => {
                        const user = mockUsers.find(
                          (u) => u.id === member.user_id
                        );
                        return (
                          <li
                            key={member.id}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                              {user?.full_name.charAt(0) ?? "?"}
                            </div>
                            <span className="text-sm whitespace-nowrap">
                              {user?.full_name ?? "不明"}
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
          <p className="text-sm text-gray-300">除外ルール未設定</p>
        ) : (
          <ul className="space-y-2">
            {exclusionRules.map((rule) => (
              <li
                key={rule.id}
                className="text-sm"
              >
                <p>{rule.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {EXCLUSION_TYPE_LABELS[rule.type]}
                  {rule.day_of_week !== undefined &&
                    `　${DAY_NAMES[rule.day_of_week]}曜日`}
                  {rule.start_time &&
                    rule.end_time &&
                    `　${rule.start_time} – ${rule.end_time}`}
                  {rule.recurring && "　（繰り返し）"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DrawerSection>

      {/* フォーム */}
      <DrawerSection title="フォーム">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <p className="min-w-[80px] leading-[1.3rem] text-xs font-semibold text-gray-600">
              デフォルト項目
            </p>
            <p className="text-sm">
              お名前・メールアドレス・電話番号
            </p>
          </div>
          <div className="flex items-start gap-4">
            <p className="min-w-[80px] leading-[1.3rem] text-xs font-semibold text-gray-600">
              カスタム項目
            </p>
            {customFields.length > 0 ? (
              <ul className="space-y-2">
                {customFields.map((field) => (
                  <li
                    key={field.id}
                    className="text-sm"
                  >
                    <p className="flex items-center gap-1">
                      {field.label}
                      {field.is_required && ("（必須）")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {FIELD_TYPE_LABELS[field.type]}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-300">カスタム項目未設定</p>
            )}
          </div>
        </div>
      </DrawerSection>

      {/* リマインド */}
      <DrawerSection title="リマインド">
        {!event.reminder_settings || event.reminder_settings.length === 0 ? (
          <p className="text-sm text-gray-300">リマインド未設定</p>
        ) : (
          <ul className="space-y-2">
            {event.reminder_settings.map((r) => (
              <li key={r.id}>
                <div className="text-sm flex items-center">
                  {{ email: "メール", sms: "SMS", both: "メール + SMS" }[
                    r.channel
                  ]}
                  <p className="text-xs ml-2">
                    {"（"}
                    {r.timing.value}
                    {r.timing.unit === "hours" ? "時間" : "日"}前
                    {!r.is_enabled && (
                      "無効"
                    )}
                    {"）"}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{r.message}</p>
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
      <Link
        href={`/events/${event.id}`}
        className="btn btn-secondary"
      >
        <Edit className="h-4 w-4" />
        編集
      </Link>
      <button onClick={onCopy} className="btn btn-primary">
        {isCopied ? (
          <>
            <Check className="h-4 w-4" />
            コピーしました
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            リンクをコピー
          </>
        )}
      </button>
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
  const [activeTab, setActiveTab] = useState<"all" | "active" | "draft">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current === activeTab) return;
    prevTabRef.current = activeTab;
    document.querySelector("main")?.scrollTo({ top: TAB_SCROLL_OFFSET, left: 0 });
  }, [activeTab]);

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

  async function handleCopyLink(id: string, slug: string) {
    const url = `${window.location.origin}/j/${slug}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedEventId(id);
      toast.success("リンクをコピーしました");
      setTimeout(() => setCopiedEventId(null), 2000);
    } else {
      toast.error("コピーに失敗しました。URLを手動でコピーしてください");
    }
  }

  const filteredEvents = eventTypes
    .filter((e) => activeTab === "all" || e.status === activeTab)
    .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const countAll = eventTypes.length;
  const countActive = eventTypes.filter((e) => e.status === "active").length;
  const countDraft = eventTypes.filter((e) => e.status === "draft").length;

  return (
    <div>
      <header className="header mb-6">
        <div className="header-col">
          <h1 className="header-title">イベント</h1>
        </div>
        <Link href="/events/new" className="btn btn-primary">
          <Plus className="h-4 w-4" />
          新規イベント作成
        </Link>
      </header>

      {/* Status tabs */}
      <div className="sticky-wrap mb-6">
        <div className="tab">
          <button
            onClick={() => setActiveTab("all")}
            className={cn("tab-item", activeTab === "all" && "tab-item-active")}
          >
            すべて
            <span className={cn("tab-badge", activeTab === "all" && "tab-badge-active")}>
              {countAll}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={cn("tab-item", activeTab === "active" && "tab-item-active")}
          >
            公開中
            <span className={cn("tab-badge", activeTab === "active" && "tab-badge-active")}>
              {countActive}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("draft")}
            className={cn("tab-item", activeTab === "draft" && "tab-item-active")}
          >
            非公開
            <span className={cn("tab-badge", activeTab === "draft" && "tab-badge-active")}>
              {countDraft}
            </span>
          </button>

          <div className="flex items-center gap-3 w-[300px] ml-auto">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="イベント名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 text-xs h-[32px]"
              />
            </div>
          </div>
        </div>
      </div>

      {
        filteredEvents.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">
              {searchQuery || activeTab !== "all" ? "条件に一致するイベントがありません" : "イベントがありません"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || activeTab !== "all"
                ? "検索条件やタブを変えてお試しください"
                : "新しいイベントを作成して面接日程の調整を始めましょう"}
            </p>
            {!searchQuery && activeTab === "all" && (
              <Link href="/events/new" className="btn btn-primary mt-4">
                <Plus className="h-4 w-4" />
                新規イベント作成
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {filteredEvents.map((event) => {
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
        )
      }

      {/* 詳細ドロワー */}
      <Drawer
        open={selectedEvent !== null}
        onClose={closeDrawer}
        title="イベント詳細"
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
    </div >
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
