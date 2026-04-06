"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Settings,
  Users,
  ShieldOff,
  FileText,
  ExternalLink,
  Plus,
  Trash2,
  Lock,
  Globe,
  EyeOff,
  Pencil,
  ChevronDown,
  GripVertical,
  Bell,
  Mail,
  MessageSquare,
  Eye,
  CalendarDays,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDndSensors } from "@/hooks/useDndSensors";
import { CSS } from "@dnd-kit/utilities";
import { cn, generateId } from "@/lib/utils";
import { TAB_SCROLL_OFFSET, DAY_NAMES, EXCLUSION_TYPE_LABELS, FIELD_TYPE_LABELS, WEEKDAY_LABELS, DEFAULT_ALLOWED_DAYS } from "@/lib/constants";
import { deleteEventTypeApi, updateEventTypeApi, useEventTypes } from "@/lib/event-store";
import { useTeamMembers } from "@/lib/hooks/useTeamMembers";
import { FieldError } from "@/components/ui/FieldError";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type {
  EventType,
  EventRole,
  EventMember,
  ExclusionRule,
  CustomField,
  FieldType,
  ReminderSetting,
  ReminderChannel,
  SchedulingMode,
  ReceptionSettings,
  WeekdayScheduleEntry,
} from "@/types";

type TabId = "basic" | "reception" | "team" | "exclusions" | "form" | "reminder";

const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: "basic", label: "基本設定", icon: Settings },
  { id: "reception", label: "受付設定", icon: CalendarDays },
  { id: "team", label: "メンバー", icon: Users },
  { id: "exclusions", label: "除外ルール", icon: ShieldOff },
  { id: "form", label: "フォーム", icon: FileText },
  { id: "reminder", label: "リマインド", icon: Bell },
];

// --- Shared Sortable Row component ---

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handle = (
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing touch-none rounded p-0.5 text-gray-300 hover:text-gray-500 transition-colors shrink-0"
      title="ドラッグして並び替え"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-50 opacity-50 bg-white shadow-md rounded-xl" : ""}
    >
      {children(handle)}
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const eventId = params.eventId as string;
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { navigate, pendingHref, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty);
  const { members: teamMembers } = useTeamMembers();

  const [event, setEvent] = useState<EventType | null | undefined>(undefined);
  const [roles, setRoles] = useState<EventRole[]>([]);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [exclusionRules, setExclusionRules] = useState<ExclusionRule[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) { setEvent(null); return; }
        setEvent(data);
        setRoles(data.event_roles ?? []);
        const allMembers = (data.event_roles ?? []).flatMap(
          (r: EventRole) => r.event_members ?? []
        );
        setMembers(allMembers);
        setExclusionRules(data.exclusion_rules ?? []);
        setCustomFields(data.custom_fields ?? []);
      })
      .catch(() => setEvent(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // タブ切替時にスクロール位置をリセット（初回訪問時はスキップ）
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current === activeTab) return;
    prevTabRef.current = activeTab;
    document.querySelector('main')?.scrollTo({
      top: TAB_SCROLL_OFFSET,
      left: 0,
    });
  }, [activeTab]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEventTypeApi(eventId);
      toast.success("イベントを削除しました");
      router.push("/events");
    } catch {
      toast.error("削除に失敗しました");
      setDeleting(false);
    }
  }

  if (event === undefined) {
    return <PageLoader />;
  }

  if (event === null) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">イベントが見つかりません</p>
        <Link href="/events" className="btn btn-primary mt-4 inline-block">
          イベント一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Settings */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <header className="header mb-6">
          <button
            onClick={() => navigate("/events")}
            className="header-back-btn"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="header-col">
            <div className="heading">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: (event.color || "#0071c1") + "14",
                }}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: event.color || "#0071c1" }}
                />
              </div>
              <h1 className="header-title">
                {event.title}
              </h1>
              <span
                className={cn(
                  "badge",
                  event.status === "active"
                    ? "badge badge-green"
                    : "badge badge-gray"
                )}
              >
                {event.status === "active" ? "公開中" : "非公開"}
              </span>
            </div>
            <p className="header-sub-title">{event.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/j/${event.slug}`}
              target="blank"
              className="btn btn-secondary"
            >
              <Eye className="h-4 w-4" />
              プレビュー
            </Link>
            <button
              onClick={() => setDeleteOpen(true)}
              className="btn btn-danger"
            >
              <Trash2 className="h-4 w-4" />
              削除
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="sticky-wrap mb-6">
          <div className="tab">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "tab-item",
                  activeTab === tab.id
                    ? "tab-item-active"
                    : ""
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="card max-w-3xl">
          {activeTab === "basic" && (
            <BasicTab event={event} onDirtyChange={setIsDirty} onSaved={setEvent} />
          )}
          {activeTab === "reception" && (
            <ReceptionTab event={event} onDirtyChange={setIsDirty} />
          )}
          {activeTab === "team" && (
            <TeamTab roles={roles} members={members} mode={event.scheduling_mode} event={event} onDirtyChange={setIsDirty} />
          )}
          {activeTab === "exclusions" && (
            <ExclusionsTab rules={exclusionRules} eventId={eventId} onDirtyChange={setIsDirty} />
          )}
          {activeTab === "form" && (
            <FormTab fields={customFields} eventId={eventId} onDirtyChange={setIsDirty} />
          )}
          {activeTab === "reminder" && (
            <ReminderTab
              eventId={eventId}
              reminders={event.reminder_settings ?? []}
              onDirtyChange={setIsDirty}
              locationType={event.location_type}
              locationDetail={event.location_detail}
            />
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        loading={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="イベントを削除しますか？"
        description={`「${event.title}」を削除します。この操作は取り消せません。`}
        confirmLabel="削除する"
        confirmVariant="danger"
      />

      <ConfirmDialog
        open={pendingHref !== null}
        onClose={cancelLeave}
        onConfirm={confirmLeave}
        title="変更を破棄しますか？"
        description="保存されていない変更があります。この画面を離れると変更が失われます。"
        confirmLabel="破棄して移動"
        confirmVariant="danger"
      />
    </div>
  );
}

// --- Tab Components ---

const EVENT_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#6b7280",
];

type BasicFormState = {
  isPublic: boolean;
  color: string;
  title: string;
  description: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
};

function BasicTab({ event, onDirtyChange, onSaved }: { event: EventType; onDirtyChange: (dirty: boolean) => void; onSaved?: (updated: EventType) => void }) {
  const toast = useToast();
  const { members: teamMembers } = useTeamMembers();
  const { eventTypes } = useEventTypes();
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<BasicFormState>({
    isPublic: event.status === "active",
    color: EVENT_COLORS.includes(event.color ?? "") ? event.color! : EVENT_COLORS[0],
    title: event.title,
    description: event.description ?? "",
    duration: event.duration,
    bufferBefore: event.buffer_before,
    bufferAfter: event.buffer_after,
  });

  function touch(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function getTitleError(): string | undefined {
    if (!form.title.trim()) return "イベント名を入力してください";
    const otherTitles = eventTypes.filter((e) => e.id !== event.id).map((e) => e.title);
    if (otherTitles.includes(form.title.trim())) return "同じ名前のイベントが既に存在します";
    return undefined;
  }

  function updateField<K extends keyof BasicFormState>(key: K, value: BasicFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    onDirtyChange(true);
  }

  return (
    <div className="space-y-5">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">基本設定</h3>
          <p className="mt-1 text-sm text-gray-500">
            イベントの基本情報を設定します
          </p>
        </div>
      </div>
      <div>
        <label className="label">イベント名</label>
        <input
          type="text"
          className={cn("input mt-1", touched.title && getTitleError() && "input-error")}
          value={form.title}
          onChange={(e) => { updateField("title", e.target.value); touch("title"); }}
          onBlur={() => touch("title")}
        />
        {touched.title && <FieldError message={getTitleError()} />}
      </div>
      <div>
        <label className="label">説明</label>
        <textarea
          className="input mt-1"
          rows={3}
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
        />
      </div>
      <div>
        <label className="label">カラー</label>
        <div className="mt-2 flex gap-2">
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateField("color", c)}
              className={cn(
                "h-8 w-8 rounded-full transition-all",
                form.color === c
                  ? "ring-2 ring-offset-2 ring-gray-400"
                  : "hover:scale-110"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">所要時間（分）</label>
          <input
            type="number"
            className="input mt-1"
            value={form.duration}
            min={15}
            step={15}
            onChange={(e) => updateField("duration", parseInt(e.target.value) || 15)}
          />
        </div>
        <div>
          <label className="label">前バッファ（分）</label>
          <input
            type="number"
            className="input mt-1"
            value={form.bufferBefore}
            min={0}
            step={5}
            onChange={(e) => updateField("bufferBefore", parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">後バッファ（分）</label>
          <input
            type="number"
            className="input mt-1"
            value={form.bufferAfter}
            min={0}
            step={5}
            onChange={(e) => updateField("bufferAfter", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Visibility */}
      <div>
        <label className="label">公開設定</label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            onClick={() => updateField("isPublic", true)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
              form.isPublic
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Globe className={cn("h-5 w-5", form.isPublic ? "text-green-600" : "text-gray-400")} />
            <div>
              <p className={cn("font-semibold text-sm", form.isPublic ? "text-green-800" : "text-gray-700")}>公開</p>
              <p className="mt-1 text-xs text-gray-500">候補者が予約できます</p>
            </div>
          </button>
          <button
            onClick={() => updateField("isPublic", false)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
              !form.isPublic
                ? "border-gray-500 bg-gray-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <EyeOff className={cn("h-5 w-5", !form.isPublic ? "text-gray-600" : "text-gray-400")} />
            <div>
              <p className={cn("font-semibold text-sm", !form.isPublic ? "text-gray-800" : "text-gray-700")}>非公開</p>
              <p className="mt-1 text-xs text-gray-500">下書き状態で保存します</p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          disabled={saving}
          onClick={async () => {
            touch("title");
            if (getTitleError()) return;
            setSaving(true);
            try {
              const updated = await updateEventTypeApi(event.id, {
                title: form.title,
                description: form.description || null,
                duration: form.duration,
                buffer_before: form.bufferBefore,
                buffer_after: form.bufferAfter,
                color: form.color,
                status: form.isPublic ? "active" : "draft",
              });
              onSaved?.(updated);
              onDirtyChange(false);
              toast.success("変更を保存しました");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "保存に失敗しました");
            } finally {
              setSaving(false);
            }
          }}
          className="btn btn-primary"
        >
          {saving && <span className="spinner" />}
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ReceptionTab
// ============================================================

function ReceptionTab({
  event,
  onDirtyChange,
}: {
  event: EventType;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const toast = useToast();
  const initial = event.reception_settings ?? {
    exclude_outside_hours: true,
    allowed_days: [...DEFAULT_ALLOWED_DAYS],
    accept_holidays: false,
    booking_window_start: { value: 3, unit: "days" as const },
    booking_window_end: { value: 2, unit: "weeks" as const },
  };
  const [settings, setSettings] = useState<ReceptionSettings>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [touchedDays, setTouchedDays] = useState(false);
  const [touchedWindow, setTouchedWindow] = useState(false);

  function getAllowedDaysError(): string | undefined {
    if (settings.allowed_days.every((d) => !d)) return "1日以上選択してください";
    return undefined;
  }

  function toAbsoluteDays(value: number, unit: string): number {
    if (unit === "weeks") return value * 7;
    if (unit === "months") return value * 30;
    return value;
  }

  function getBookingWindowError(): string | undefined {
    const start = settings.booking_window_start ?? { value: 3, unit: "days" };
    const end = settings.booking_window_end ?? { value: 2, unit: "weeks" };
    const startDays = toAbsoluteDays(start.value, start.unit);
    const endDays = toAbsoluteDays(end.value, end.unit);
    if (endDays <= startDays) return "「受付終了」は「受付開始」より後にしてください";
    return undefined;
  }

  async function handleSave() {
    setTouchedDays(true);
    setTouchedWindow(true);
    if (getAllowedDaysError()) return;
    if (getBookingWindowError()) return;
    setSaving(true);
    try {
      await updateEventTypeApi(event.id, { reception_settings: settings });
      toast.success("変更を保存しました");
      onDirtyChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(i: number) {
    const updated = [...settings.allowed_days];
    updated[i] = !updated[i];
    setSettings({ ...settings, allowed_days: updated });
    setTouchedDays(true);
    onDirtyChange(true);
  }

  return (
    <div>
      <h3 className="text-lg font-bold">受付設定</h3>
      <p className="text-sm text-gray-500 mt-1">予約を受け付ける時間・曜日を設定します</p>
      <div className="mt-6 space-y-6">
        {/* 時間設定 */}
        <div>
          <label className="label">時間設定</label>
          <button
            type="button"
            className={cn("toggle-btn w-[250px] mt-1", settings.exclude_outside_hours && "toggle-btn-active")}
            onClick={() => { setSettings({ ...settings, exclude_outside_hours: !settings.exclude_outside_hours }); onDirtyChange(true); }}
          >
            <span>営業時間外は受け付けない</span>
            <span className={cn("toggle-btn-switch", settings.exclude_outside_hours && "toggle-btn-switch-active")}>
              <span className={cn("toggle-btn-switch-handle", settings.exclude_outside_hours && "toggle-btn-switch-handle-active")} />
            </span>
          </button>
        </div>
        {/* 曜日設定 */}
        <div>
          <label className="label">曜日設定</label>
          <div className="mt-1">
            <div className="flex flex-wrap gap-3">
              {WEEKDAY_LABELS.map((label, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex cursor-pointer items-center justify-center rounded-xl border-[1px] h-[42px] w-[42px] px-3 py-2 text-sm font-semibold transition-all select-none",
                    settings.allowed_days[i]
                      ? "border-primary-300 bg-primary-50 text-primary-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  <input type="checkbox" className="sr-only" checked={settings.allowed_days[i]} onChange={() => toggleDay(i)} />
                  {label}
                </label>
              ))}
            </div>
            {touchedDays && <FieldError message={getAllowedDaysError()} />}
            <button
              type="button"
              className={cn("toggle-btn w-[250px] mt-4", settings.accept_holidays && "toggle-btn-active")}
              onClick={() => { setSettings({ ...settings, accept_holidays: !settings.accept_holidays }); onDirtyChange(true); }}
            >
              <span>祝日は受け付ける</span>
              <span className={cn("toggle-btn-switch", settings.accept_holidays && "toggle-btn-switch-active")}>
                <span className={cn("toggle-btn-switch-handle", settings.accept_holidays && "toggle-btn-switch-handle-active")} />
              </span>
            </button>
          </div>
        </div>
        {/* 受付期間設定 */}
        <div>
          <label className="label">受付期間</label>
          <div className="mt-3 space-y-3">
            <div className="flex gap-4 items-center">
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    className="input mt-1"
                    min={0}
                    value={settings.booking_window_start?.value ?? 3}
                    onChange={(e) => {
                      setSettings({ ...settings, booking_window_start: { value: parseInt(e.target.value) || 0, unit: settings.booking_window_start?.unit ?? "days" } });
                      setTouchedWindow(true);
                      onDirtyChange(true);
                    }}
                  />
                  <select
                    className="select mt-1"
                    value={settings.booking_window_start?.unit ?? "days"}
                    onChange={(e) => {
                      setSettings({ ...settings, booking_window_start: { value: settings.booking_window_start?.value ?? 3, unit: e.target.value as "days" | "weeks" | "months" } });
                      setTouchedWindow(true);
                      onDirtyChange(true);
                    }}
                  >
                    <option value="days">日後</option>
                    <option value="weeks">週間後</option>
                    <option value="months">ヶ月後</option>
                  </select>
                </div>
              </div>
              <div className="text-gray-500">〜</div>
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    className="input mt-1"
                    min={1}
                    value={settings.booking_window_end?.value ?? 2}
                    onChange={(e) => {
                      setSettings({ ...settings, booking_window_end: { value: parseInt(e.target.value) || 1, unit: settings.booking_window_end?.unit ?? "weeks" } });
                      setTouchedWindow(true);
                      onDirtyChange(true);
                    }}
                  />
                  <select
                    className="select mt-1"
                    value={settings.booking_window_end?.unit ?? "weeks"}
                    onChange={(e) => {
                      setSettings({ ...settings, booking_window_end: { value: settings.booking_window_end?.value ?? 2, unit: e.target.value as "days" | "weeks" | "months" } });
                      setTouchedWindow(true);
                      onDirtyChange(true);
                    }}
                  >
                    <option value="days">日後</option>
                    <option value="weeks">週間後</option>
                    <option value="months">ヶ月後</option>
                  </select>
                </div>
              </div>
            </div>
            {touchedWindow && <FieldError message={getBookingWindowError()} />}
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving && <span className="spinner" />}
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </div>
    </div>
  );
}

function TeamTab({
  roles,
  members,
  mode: initialMode,
  event,
  onDirtyChange,
}: {
  roles: EventRole[];
  members: EventMember[];
  mode: SchedulingMode;
  event: EventType;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const toast = useToast();
  const { members: teamMembers } = useTeamMembers();
  const [mode, setMode] = useState(initialMode);

  // Fixed mode: ordered list of user IDs
  const initialFixedMemberIds = roles
    .flatMap((role) => members.filter((m) => m.role_id === role.id))
    .map((m) => m.user_id);
  const [fixedMemberIds, setFixedMemberIds] = useState<string[]>(initialFixedMemberIds);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  // Pool mode: ordered roles with ordered member IDs
  const initialLocalRoles = [...roles]
    .sort((a, b) => a.priority_order - b.priority_order)
    .map((role) => ({
      ...role,
      memberIds: members
        .filter((m) => m.role_id === role.id)
        .map((m) => m.user_id),
    }));
  const [localRoles, setLocalRoles] = useState(initialLocalRoles);
  const [memberPickerRoleId, setMemberPickerRoleId] = useState<string | null>(null);
  const [showAddRoleForm, setShowAddRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCount, setNewRoleCount] = useState(1);

  // Weekday mode: weekday schedule
  const initialWeekdaySchedule: WeekdayScheduleEntry[] = event.weekday_schedule ?? [];
  const [weekdaySchedule, setWeekdaySchedule] = useState<WeekdayScheduleEntry[]>(initialWeekdaySchedule);
  const [weekdayMemberDropdownOpen, setWeekdayMemberDropdownOpen] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function touch(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function getWeekdayMemberError(dayIndex: number): string | undefined {
    const entry = weekdaySchedule.find((e) => e.day_index === dayIndex);
    const memberIds = entry?.member_ids ?? [];
    const requiredCount = entry?.required_count ?? 1;
    if (memberIds.length === 0) return "メンバーを1人以上追加してください";
    if (requiredCount > memberIds.length) return "必要人数が登録人数を超えています";
    return undefined;
  }

  function getFixedMembersError(): string | undefined {
    if (fixedMemberIds.length === 0) return "メンバーを1人以上追加してください";
    return undefined;
  }

  function getRoleMembersError(roleId: string): string | undefined {
    const role = localRoles.find((r) => r.id === roleId);
    if (!role) return undefined;
    if (role.memberIds.length === 0) return "メンバーを1人以上追加してください";
    if (role.required_count > role.memberIds.length) return "必要人数が登録人数を超えています";
    return undefined;
  }

  function hasTeamErrors(): boolean {
    if (mode === "weekday") {
      return enabledDays.some(({ dayIndex }) => getWeekdayMemberError(dayIndex));
    }
    if (mode === "fixed") return !!getFixedMembersError();
    if (mode === "pool") return localRoles.some((r) => getRoleMembersError(r.id));
    return false;
  }

  // Pool mode: role inline editing
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [editingRoleCount, setEditingRoleCount] = useState(1);

  // Enabled days from reception settings
  const receptionAllowedDays = event.reception_settings?.allowed_days ?? [...DEFAULT_ALLOWED_DAYS];
  const enabledDays = WEEKDAY_LABELS
    .map((label, i) => ({ label, dayIndex: i }))
    .filter((_, i) => receptionAllowedDays[i]);

  // DnD sensors
  const sensors = useDndSensors();

  // Fixed mode: add member
  function addFixedMember(userId: string) {
    if (!fixedMemberIds.includes(userId)) {
      setFixedMemberIds([...fixedMemberIds, userId]);
      onDirtyChange(true);
    }
    setShowMemberPicker(false);
    touch("fixedMembers");
  }

  function removeFixedMember(userId: string) {
    setFixedMemberIds(fixedMemberIds.filter((id) => id !== userId));
    onDirtyChange(true);
    touch("fixedMembers");
  }

  function handleFixedMemberDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFixedMemberIds((ids) => {
        const oldIndex = ids.indexOf(active.id as string);
        const newIndex = ids.indexOf(over.id as string);
        return arrayMove(ids, oldIndex, newIndex);
      });
    }
  }

  // Pool mode: role management
  function handleAddRole() {
    if (!newRoleName.trim()) return;
    const newRole = {
      id: generateId(),
      event_id: roles[0]?.event_id ?? "",
      name: newRoleName.trim(),
      required_count: newRoleCount,
      priority_order: localRoles.length + 1,
      memberIds: [] as string[],
    };
    setLocalRoles([...localRoles, newRole]);
    setNewRoleName("");
    setNewRoleCount(1);
    setShowAddRoleForm(false);
    onDirtyChange(true);
  }

  function removeRole(roleId: string) {
    setLocalRoles(localRoles.filter((r) => r.id !== roleId));
    onDirtyChange(true);
  }

  function handleRoleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalRoles((roles) => {
        const oldIndex = roles.findIndex((r) => r.id === active.id);
        const newIndex = roles.findIndex((r) => r.id === over.id);
        return arrayMove(roles, oldIndex, newIndex).map((r, i) => ({
          ...r,
          priority_order: i + 1,
        }));
      });
      onDirtyChange(true);
    }
  }

  // Pool mode: member management per role
  function addMemberToRole(roleId: string, userId: string) {
    setLocalRoles(
      localRoles.map((r) => {
        if (r.id !== roleId || r.memberIds.includes(userId)) return r;
        return { ...r, memberIds: [...r.memberIds, userId] };
      })
    );
    setMemberPickerRoleId(null);
    onDirtyChange(true);
    touch(`role_${roleId}_members`);
  }

  function removeMemberFromRole(roleId: string, userId: string) {
    setLocalRoles(
      localRoles.map((r) => {
        if (r.id !== roleId) return r;
        return { ...r, memberIds: r.memberIds.filter((id) => id !== userId) };
      })
    );
    onDirtyChange(true);
    touch(`role_${roleId}_members`);
  }

  function handleRoleMemberDragEnd(event: DragEndEvent, roleId: string) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalRoles((roles) =>
        roles.map((r) => {
          if (r.id !== roleId) return r;
          const oldIndex = r.memberIds.indexOf(active.id as string);
          const newIndex = r.memberIds.indexOf(over.id as string);
          return { ...r, memberIds: arrayMove(r.memberIds, oldIndex, newIndex) };
        })
      );
      onDirtyChange(true);
    }
  }

  // Pool mode: role inline editing
  function startEditingRole(role: { id: string; name: string; required_count: number }) {
    setEditingRoleId(role.id);
    setEditingRoleName(role.name);
    setEditingRoleCount(role.required_count);
  }

  function confirmEditingRole() {
    if (!editingRoleName.trim()) return;
    setLocalRoles(localRoles.map((r) =>
      r.id === editingRoleId
        ? { ...r, name: editingRoleName.trim(), required_count: editingRoleCount }
        : r
    ));
    setEditingRoleId(null);
    onDirtyChange(true);
  }

  function cancelEditingRole() {
    setEditingRoleId(null);
  }

  // Weekday mode: member management
  function addWeekdayMember(dayIndex: number, userId: string) {
    setWeekdaySchedule((prev) => {
      const existing = prev.find((e) => e.day_index === dayIndex);
      if (existing) {
        if (existing.member_ids.includes(userId)) return prev;
        return prev.map((e) => e.day_index === dayIndex ? { ...e, member_ids: [...e.member_ids, userId] } : e);
      }
      return [...prev, { day_index: dayIndex, member_ids: [userId] }];
    });
    setWeekdayMemberDropdownOpen(null);
    onDirtyChange(true);
    touch(`weekday_${dayIndex}`);
  }

  function removeWeekdayMember(dayIndex: number, userId: string) {
    setWeekdaySchedule((prev) =>
      prev.map((e) => e.day_index === dayIndex ? { ...e, member_ids: e.member_ids.filter((id) => id !== userId) } : e)
    );
    onDirtyChange(true);
    touch(`weekday_${dayIndex}`);
  }

  function handleWeekdayMemberDragEnd(dragEvent: DragEndEvent, dayIndex: number) {
    const { active, over } = dragEvent;
    if (over && active.id !== over.id) {
      setWeekdaySchedule((prev) =>
        prev.map((e) => {
          if (e.day_index !== dayIndex) return e;
          const activeId = (active.id as string).replace(`wd-${dayIndex}-`, "");
          const overId = (over.id as string).replace(`wd-${dayIndex}-`, "");
          const oldIndex = e.member_ids.indexOf(activeId);
          const newIndex = e.member_ids.indexOf(overId);
          return { ...e, member_ids: arrayMove(e.member_ids, oldIndex, newIndex) };
        })
      );
      onDirtyChange(true);
    }
  }

  function updateWeekdayRequiredCount(dayIndex: number, count: number) {
    setWeekdaySchedule((prev) => {
      const existing = prev.find((e) => e.day_index === dayIndex);
      if (existing) {
        return prev.map((e) => e.day_index === dayIndex ? { ...e, required_count: count } : e);
      }
      return [...prev, { day_index: dayIndex, member_ids: [], required_count: count }];
    });
    onDirtyChange(true);
  }

  async function handleSave() {
    // 全touched をセットしてバリデーション
    const touchKeys: string[] = [];
    if (mode === "weekday") {
      enabledDays.forEach(({ dayIndex }) => touchKeys.push(`weekday_${dayIndex}`));
    } else if (mode === "fixed") {
      touchKeys.push("fixedMembers");
    } else if (mode === "pool") {
      localRoles.forEach((r) => touchKeys.push(`role_${r.id}_members`));
    }
    setTouched((prev) => { const next = { ...prev }; touchKeys.forEach((k) => { next[k] = true; }); return next; });
    if (hasTeamErrors()) return;
    setSaving(true);
    try {
      // スケジューリングモードに応じてロールを構築
      const rolesPayload =
        mode === "fixed"
          ? [{ name: roles[0]?.name ?? "メンバー", required_count: 1, priority_order: 1, member_ids: fixedMemberIds }]
          : mode === "pool"
            ? localRoles.map((r, i) => ({
              name: r.name,
              required_count: r.required_count,
              priority_order: i + 1,
              member_ids: r.memberIds,
            }))
            : []; // weekday モードはロール不要

      await updateEventTypeApi(event.id, {
        scheduling_mode: mode,
        ...(mode === "weekday" ? { weekday_schedule: weekdaySchedule } : {}),
        roles: rolesPayload,
      });
      toast.success("変更を保存しました");
      onDirtyChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Mode selector */}
      <div className="mb-6">
        <h3 className="text-lg font-bold">メンバー</h3>
        <p className="text-sm text-gray-500 mt-1">スケジューリングモードとメンバーを設定します</p>
        <label className="label mt-6">スケジューリングモード</label>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <button
            onClick={() => { setMode("weekday"); onDirtyChange(true); }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
              mode === "weekday"
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <CalendarDays className={cn("h-5 w-5 shrink-0", mode === "weekday" ? "text-primary-600" : "text-gray-400")} />
            <div>
              <h4 className="text-sm font-semibold">曜日モード</h4>
              <p className="mt-1 text-xs text-gray-500">
                曜日ごとにメンバーを設定
              </p>
            </div>
          </button>
          <button
            onClick={() => { setMode("fixed"); onDirtyChange(true); }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
              mode === "fixed"
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Lock className={cn("h-5 w-5", mode === "fixed" ? "text-primary-600" : "text-gray-400")} />
            <div>
              <h4 className="text-sm font-semibold">固定モード</h4>
              <p className="mt-1 text-xs text-gray-500">
                優先順でメンバーを設定
              </p>
            </div>
          </button>
          <button
            onClick={() => { setMode("pool"); onDirtyChange(true); }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
              mode === "pool"
                ? "border-primary-600 bg-primary-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <Users className={cn("h-5 w-5", mode === "pool" ? "text-primary-600" : "text-gray-400")} />
            <div>
              <h4 className="text-sm font-semibold">プールモード</h4>
              <p className="mt-1 text-xs text-gray-500">
                役割ごとにメンバーを設定
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Weekday mode */}
      {mode === "weekday" && (
        <div>
          <p className="label mb-3">曜日別メンバー<span className="font-normal ml-1.5 text-xs text-gray-400">（上から優先度順）</span></p>
          {enabledDays.length === 0 ? (
            <p className="text-sm text-gray-400">受付設定タブで曜日を有効にしてください</p>
          ) : (
            <div className="space-y-3">
              {enabledDays.map(({ label, dayIndex }) => {
                const entry = weekdaySchedule.find((e) => e.day_index === dayIndex) ?? { day_index: dayIndex, member_ids: [] };
                const usedIds = entry.member_ids;
                return (
                  <div key={dayIndex} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">{label}</span>
                        <span className="text-xs text-gray-400">{usedIds.length}人登録</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>必要人数:</span>
                        <input
                          type="number"
                          min={1}
                          className="input w-14 text-center px-1"
                          value={entry.required_count ?? 1}
                          onChange={(e) => updateWeekdayRequiredCount(dayIndex, parseInt(e.target.value) || 1)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>人</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-100 divide-y divide-gray-50">
                      {usedIds.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-gray-400 text-center">メンバーを追加してください</p>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => handleWeekdayMemberDragEnd(e, dayIndex)}
                        >
                          <SortableContext
                            items={usedIds.map((uid) => `wd-${dayIndex}-${uid}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            {usedIds.map((userId, memberIndex) => {
                              const user = teamMembers.find((u) => u.id === userId);
                              return (
                                <SortableRow key={`wd-${dayIndex}-${userId}`} id={`wd-${dayIndex}-${userId}`}>
                                  {(handle) => (
                                    <div className="flex items-center gap-3 px-4 py-3">
                                      {handle}
                                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-100 px-1 text-xs font-semibold text-primary-700 shrink-0">
                                        {memberIndex + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{user?.full_name || "Unknown"}</p>
                                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                                      </div>
                                      <button
                                        onClick={() => removeWeekdayMember(dayIndex, userId)}
                                        className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  )}
                                </SortableRow>
                              );
                            })}
                          </SortableContext>
                        </DndContext>
                      )}
                      <div className="relative">
                        <button
                          onClick={() => setWeekdayMemberDropdownOpen(weekdayMemberDropdownOpen === dayIndex ? null : dayIndex)}
                          className="flex w-full items-center gap-1.5 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          メンバーを追加
                          <ChevronDown className="h-3 w-3 ml-auto" />
                        </button>
                        {weekdayMemberDropdownOpen === dayIndex && (
                          <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                            {teamMembers
                              .filter((u) => !usedIds.includes(u.id))
                              .map((user) => (
                                <button
                                  key={user.id}
                                  onClick={() => addWeekdayMember(dayIndex, user.id)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                                    {user.full_name.charAt(0)}
                                  </div>
                                  <div className="text-left min-w-0">
                                    <p className="font-medium truncate">{user.full_name}</p>
                                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                  </div>
                                </button>
                              ))}
                            {teamMembers.filter((u) => !usedIds.includes(u.id)).length === 0 && (
                              <p className="px-3 py-2 text-sm text-gray-400 whitespace-nowrap">追加できるメンバーがいません</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {touched[`weekday_${dayIndex}`] && <FieldError message={getWeekdayMemberError(dayIndex)} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Fixed mode */}
      {mode === "fixed" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="label">
              メンバー
              <span className="font-normal ml-1.5 text-xs text-gray-400">（上から優先度順）</span>
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {fixedMemberIds.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                メンバーを追加してください
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleFixedMemberDragEnd}
              >
                <SortableContext
                  items={fixedMemberIds}
                  strategy={verticalListSortingStrategy}
                >
                  {fixedMemberIds.map((userId, index) => {
                    const user = teamMembers.find((u) => u.id === userId);
                    return (
                      <SortableRow key={userId} id={userId}>
                        {(handle) => (
                          <div className="flex items-center gap-3 px-4 py-3">
                            {handle}
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-100 px-1 text-xs font-semibold text-primary-700 shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {user?.full_name || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                            </div>
                            <button
                              onClick={() => removeFixedMember(userId)}
                              className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </SortableRow>
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}

            {/* メンバー追加ボタン */}
            <div className="relative">
              <button
                onClick={() => setShowMemberPicker(!showMemberPicker)}
                className="flex w-full items-center gap-1.5 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-3 w-3" />
                メンバーを追加
                <ChevronDown className="h-3 w-3 ml-auto" />
              </button>
              {showMemberPicker && (
                <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  {teamMembers
                    .filter((u) => !fixedMemberIds.includes(u.id))
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => addFixedMember(user.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                          {user.full_name.charAt(0)}
                        </div>
                        <div className="text-left min-w-0">
                          <p className="font-medium truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  {teamMembers.filter((u) => !fixedMemberIds.includes(u.id)).length === 0 && (
                    <p className="px-3 py-2 text-sm text-gray-400 whitespace-nowrap">
                      追加できるメンバーがいません
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {touched.fixedMembers && <FieldError message={getFixedMembersError()} />}
        </div>
      )}

      {/* Pool mode */}
      {mode === "pool" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="label">役割とメンバー</p>
          </div>
          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleRoleDragEnd}
            >
              <SortableContext
                items={localRoles.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                {localRoles.map((role, roleIndex) => (
                  <SortableRow key={role.id} id={role.id}>
                    {(handle) => (
                      <div className="text-sm rounded-2xl border border-gray-200 p-4">
                        {/* Role header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {handle}
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-semibold text-gray-600 shrink-0">
                              {roleIndex + 1}
                            </span>
                            {editingRoleId === role.id ? (
                              <>
                                <input
                                  type="text"
                                  className="input text-sm flex-1 min-w-0"
                                  value={editingRoleName}
                                  onChange={(e) => setEditingRoleName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") confirmEditingRole(); if (e.key === "Escape") cancelEditingRole(); }}
                                  autoFocus
                                />
                                <input
                                  type="number"
                                  className="input w-16 text-center px-1 shrink-0"
                                  min={1}
                                  value={editingRoleCount}
                                  onChange={(e) => setEditingRoleCount(parseInt(e.target.value) || 1)}
                                />
                                <span className="text-xs text-gray-500 shrink-0">人</span>
                                <div className="flex justify-end gap-2 pt-1  ml-5">
                                  <button
                                    onClick={cancelEditingRole}
                                    className="btn btn-ghost"
                                  >
                                    キャンセル
                                  </button>
                                  <button
                                    onClick={confirmEditingRole}
                                    disabled={!editingRoleName.trim()}
                                    className="btn btn-primary"
                                  >
                                    保存
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <span className="font-medium truncate">{role.name}</span>
                                  <span className="text-sm text-gray-500 shrink-0">（{role.required_count}人）</span>
                                </div>
                                <button
                                  onClick={() => startEditingRole(role)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                          {editingRoleId !== role.id && (
                            <button
                              onClick={() => removeRole(role.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors ml-4 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Members within role */}
                        <div className="rounded-xl border border-gray-100 divide-y divide-gray-50">
                          {role.memberIds.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-gray-400 text-center">
                              メンバーを追加してください
                            </p>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(e) => handleRoleMemberDragEnd(e, role.id)}
                            >
                              <SortableContext
                                items={role.memberIds}
                                strategy={verticalListSortingStrategy}
                              >
                                {role.memberIds.map((userId, memberIndex) => {
                                  const user = teamMembers.find((u) => u.id === userId);
                                  return (
                                    <SortableRow key={userId} id={userId}>
                                      {(memberHandle) => (
                                        <div className="flex items-center gap-2 px-3 py-2.5">
                                          {memberHandle}
                                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-50 px-1 text-xs font-semibold text-primary-600 shrink-0">
                                            {memberIndex + 1}
                                          </span>
                                          <span className="flex-1 text-sm text-gray-700 truncate">
                                            {user?.full_name || "Unknown"}
                                          </span>
                                          <button
                                            onClick={() => removeMemberFromRole(role.id, userId)}
                                            className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </SortableRow>
                                  );
                                })}
                              </SortableContext>
                            </DndContext>
                          )}

                          {/* Add member to role */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setMemberPickerRoleId(
                                  memberPickerRoleId === role.id ? null : role.id
                                )
                              }
                              className="flex w-full items-center gap-1.5 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                              メンバーを追加
                              <ChevronDown className="h-3 w-3 ml-auto" />
                            </button>
                            {memberPickerRoleId === role.id && (
                              <div className="absolute left-0 top-full z-10 mt-0.5 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                                {teamMembers
                                  .filter((u) => !role.memberIds.includes(u.id))
                                  .map((user) => (
                                    <button
                                      key={user.id}
                                      onClick={() => addMemberToRole(role.id, user.id)}
                                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                                        {user.full_name.charAt(0)}
                                      </div>
                                      <div className="text-left min-w-0">
                                        <p className="font-medium truncate">{user.full_name}</p>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                      </div>
                                    </button>
                                  ))}
                                {teamMembers.filter((u) => !role.memberIds.includes(u.id)).length === 0 && (
                                  <p className="px-3 py-2 text-sm text-gray-400 whitespace-nowrap">
                                    追加できるメンバーがいません
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {touched[`role_${role.id}_members`] && <FieldError message={getRoleMembersError(role.id)} />}
                      </div>
                    )}
                  </SortableRow>
                ))}
              </SortableContext>
            </DndContext>

            {/* Add role */}
            {showAddRoleForm ? (
              <div className="bg-hilight rounded-2xl border border-primary-200 p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="label">役割名</label>
                    <input
                      type="text"
                      className="input mt-1"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="例: 面接官"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="label">必要人数</label>
                    <input
                      type="number"
                      className="input mt-1 w-24"
                      value={newRoleCount}
                      min={1}
                      onChange={(e) => setNewRoleCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowAddRoleForm(false);
                      setNewRoleName("");
                      setNewRoleCount(1);
                    }}
                    className="btn btn-ghost"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddRole}
                    disabled={!newRoleName.trim()}
                    className="btn btn-primary"
                  >
                    追加
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddRoleForm(true)}
                className="add-btn"
              >
                <Plus className="h-4 w-4" />
                役割を追加
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving && <span className="spinner" />}
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </div>
    </div>
  );
}

type ExclusionDraft = {
  name: string;
  type: "all-day" | "time-range";
  recurring: boolean;
  day_of_week?: number;
  specific_date?: string;
  start_time?: string;
  end_time?: string;
};

const EMPTY_EXCLUSION_DRAFT: ExclusionDraft = {
  name: "",
  type: "all-day",
  recurring: true,
  day_of_week: undefined,
  specific_date: "",
  start_time: "09:00",
  end_time: "10:00",
};

function ExclusionForm({
  draft,
  onDraftChange,
  onSave,
  onCancel,
  saveLabel = "保存",
  existingNames = [],
  excludeId,
}: {
  draft: ExclusionDraft;
  onDraftChange: (d: ExclusionDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  existingNames?: string[];
  excludeId?: string;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function touch(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function getNameError(): string | undefined {
    if (!draft.name.trim()) return "ルール名を入力してください";
    const isDuplicate = existingNames.some((n) => n === draft.name.trim());
    if (isDuplicate) return "同じ名前のルールが既に存在します";
    return undefined;
  }

  function getDateError(): string | undefined {
    if (!draft.recurring && !draft.specific_date) return "対象日を選択してください";
    return undefined;
  }

  function handleSave() {
    const allTouched = { name: true, date: true };
    setTouched(allTouched);
    if (getNameError() || getDateError()) return;
    onSave();
  }

  return (
    <div className="mt-3 bg-hilight rounded-2xl border border-primary-200 p-4 space-y-3">
      <div>
        <label className="label">ルール名</label>
        <input
          type="text"
          className={cn("input mt-1", touched.name && getNameError() && "input-error")}
          value={draft.name}
          onChange={(e) => { onDraftChange({ ...draft, name: e.target.value }); touch("name"); }}
          onBlur={() => touch("name")}
          placeholder="例: 昼休み"
        />
        {touched.name && <FieldError message={getNameError()} />}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">タイプ</label>
          <select
            className="select mt-1"
            value={draft.type}
            onChange={(e) => onDraftChange({ ...draft, type: e.target.value as "all-day" | "time-range" })}
          >
            <option value="all-day">終日</option>
            <option value="time-range">時間帯</option>
          </select>
        </div>
        <div>
          <label className="label">繰り返し</label>
          <button
            onClick={() => onDraftChange({ ...draft, recurring: !draft.recurring })}
            className={cn(
              "toggle-btn mt-1",
              draft.recurring ? "toggle-btn-active" : ""
            )}
          >
            <span>繰り返す</span>
            <div className={cn("toggle-btn-switch", draft.recurring ? "toggle-btn-switch-active" : "")}>
              <span className={cn("toggle-btn-switch-handle", draft.recurring ? "toggle-btn-switch-handle-active" : "")} />
            </div>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {draft.recurring ? (
          <div>
            <label className="label">曜日</label>
            <select
              className="select mt-1"
              value={draft.day_of_week ?? ""}
              onChange={(e) =>
                onDraftChange({
                  ...draft,
                  day_of_week: e.target.value === "" ? undefined : parseInt(e.target.value),
                })
              }
            >
              <option value="">毎日</option>
              {DAY_NAMES.map((d, i) => (
                <option key={i} value={i}>{d}曜日</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="label">対象日</label>
            <input
              type="date"
              className={cn("input mt-1", touched.date && getDateError() && "input-error")}
              value={draft.specific_date ?? ""}
              onChange={(e) => { onDraftChange({ ...draft, specific_date: e.target.value }); touch("date"); }}
            />
            {touched.date && <FieldError message={getDateError()} />}
          </div>
        )}
        {draft.type === "time-range" && (
          <>
            <div>
              <label className="label">開始時刻</label>
              <input type="time" className="input mt-1"
                value={draft.start_time ?? "09:00"}
                onChange={(e) => onDraftChange({ ...draft, start_time: e.target.value })} />
            </div>
            <div>
              <label className="label">終了時刻</label>
              <input type="time" className="input mt-1"
                value={draft.end_time ?? "10:00"}
                onChange={(e) => onDraftChange({ ...draft, end_time: e.target.value })} />
            </div>
          </>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="btn btn-ghost">キャンセル</button>
        <button onClick={handleSave} className="btn btn-primary">
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

function ExclusionsTab({ rules, eventId, onDirtyChange }: { rules: ExclusionRule[]; eventId: string; onDirtyChange: (dirty: boolean) => void }) {
  const toast = useToast();

  const [localRules, setLocalRules] = useState<ExclusionRule[]>(rules);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState<ExclusionDraft>({ ...EMPTY_EXCLUSION_DRAFT });
  const [editDraft, setEditDraft] = useState<ExclusionDraft>({ ...EMPTY_EXCLUSION_DRAFT });
  const [saving, setSaving] = useState(false);

  function handleAddSave() {
    const newRule: ExclusionRule = {
      id: generateId(),
      event_id: eventId,
      name: addDraft.name,
      type: addDraft.type,
      recurring: addDraft.recurring,
      day_of_week: addDraft.recurring ? addDraft.day_of_week : undefined,
      specific_date: !addDraft.recurring ? addDraft.specific_date : undefined,
      start_time: addDraft.type === "time-range" ? addDraft.start_time : undefined,
      end_time: addDraft.type === "time-range" ? addDraft.end_time : undefined,
    };
    setLocalRules([...localRules, newRule]);
    setAddDraft({ ...EMPTY_EXCLUSION_DRAFT });
    setShowAddForm(false);
    onDirtyChange(true);
  }

  function handleEditStart(rule: ExclusionRule) {
    setEditingId(rule.id);
    setEditDraft({
      name: rule.name,
      type: rule.type,
      recurring: rule.recurring,
      day_of_week: rule.day_of_week,
      specific_date: rule.specific_date ?? "",
      start_time: rule.start_time ?? "09:00",
      end_time: rule.end_time ?? "10:00",
    });
  }

  function handleEditSave(ruleId: string) {
    setLocalRules(
      localRules.map((r) =>
        r.id !== ruleId
          ? r
          : {
            ...r,
            name: editDraft.name,
            type: editDraft.type,
            recurring: editDraft.recurring,
            day_of_week: editDraft.recurring ? editDraft.day_of_week : undefined,
            specific_date: !editDraft.recurring ? editDraft.specific_date : undefined,
            start_time: editDraft.type === "time-range" ? editDraft.start_time : undefined,
            end_time: editDraft.type === "time-range" ? editDraft.end_time : undefined,
          }
      )
    );
    setEditingId(null);
    onDirtyChange(true);
  }

  function handleDelete(ruleId: string) {
    setLocalRules(localRules.filter((r) => r.id !== ruleId));
    onDirtyChange(true);
  }

  async function handleSaveAll() {
    if (showAddForm || editingId !== null) {
      toast.error("編集中のフォームを保存またはキャンセルしてから保存してください");
      return;
    }
    setSaving(true);
    try {
      await updateEventTypeApi(eventId, { exclusion_rules: localRules });
      toast.success("変更を保存しました");
      onDirtyChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">除外ルール</h3>
          <p className="mt-1 text-sm text-gray-500">特定の日時をスケジュール対象外にします</p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {localRules.map((rule) => (
          <div key={rule.id}>
            {editingId === rule.id ? (
              <ExclusionForm
                draft={editDraft}
                onDraftChange={setEditDraft}
                onSave={() => handleEditSave(rule.id)}
                onCancel={() => setEditingId(null)}
                saveLabel="保存"
                existingNames={localRules.filter((r) => r.id !== rule.id).map((r) => r.name)}
              />
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 p-4">
                <div>
                  <p className="text-sm font-medium">{rule.name}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {rule.type === "all-day" ? "終日" : `${rule.start_time} - ${rule.end_time}`}
                    {rule.recurring && rule.day_of_week !== undefined && (
                      <span> · 毎週{DAY_NAMES[rule.day_of_week]}曜日</span>
                    )}
                    {rule.recurring && rule.day_of_week === undefined && (
                      <span> · 毎日</span>
                    )}
                    {!rule.recurring && rule.specific_date && (
                      <span> · {rule.specific_date}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    rule.recurring ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                  )}>
                    {rule.recurring ? "繰り返し" : "1回限り"}
                  </span>
                  <button
                    onClick={() => handleEditStart(rule)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="編集"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showAddForm && (
        <ExclusionForm
          draft={addDraft}
          onDraftChange={setAddDraft}
          onSave={handleAddSave}
          onCancel={() => { setShowAddForm(false); setAddDraft({ ...EMPTY_EXCLUSION_DRAFT }); }}
          saveLabel="追加"
          existingNames={localRules.map((r) => r.name)}
        />
      )}

      {!showAddForm && (
        <button onClick={() => setShowAddForm(true)} className="mt-3 add-btn">
          <Plus className="h-4 w-4" />
          ルールを追加
        </button>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={handleSaveAll} disabled={saving} className="btn btn-primary">
          {saving && <span className="spinner" />}
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </div>
    </div>
  );
}

type FieldDraft = {
  label: string;
  type: FieldType;
  placeholder: string;
  is_required: boolean;
};

const EMPTY_FIELD_DRAFT: FieldDraft = {
  label: "",
  type: "text",
  placeholder: "",
  is_required: false,
};

function FieldForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saveLabel = "保存",
  existingLabels = [],
}: {
  draft: FieldDraft;
  setDraft: (d: FieldDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  existingLabels?: string[];
}) {
  const [touched, setTouchedLocal] = useState<Record<string, boolean>>({});

  function touchField(key: string) {
    setTouchedLocal((prev) => ({ ...prev, [key]: true }));
  }

  function getLabelError(): string | undefined {
    if (!draft.label.trim()) return "ラベル名を入力してください";
    if (existingLabels.includes(draft.label.trim())) return "同じラベル名が既に存在します";
    return undefined;
  }

  function handleSave() {
    setTouchedLocal({ label: true });
    if (getLabelError()) return;
    onSave();
  }

  return (
    <div className="mt-2 bg-hilight rounded-2xl border border-primary-200 p-4 space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label">ラベル名</label>
          <input
            type="text"
            className={cn("input mt-1", touched.label && getLabelError() && "input-error")}
            value={draft.label}
            onChange={(e) => { setDraft({ ...draft, label: e.target.value }); touchField("label"); }}
            onBlur={() => touchField("label")}
            placeholder="例: 希望年収"
          />
          {touched.label && <FieldError message={getLabelError()} />}
        </div>
        <div className="w-[220px]">
          <label className="label">必須項目</label>
          <button
            onClick={() => setDraft({ ...draft, is_required: !draft.is_required })}
            className={cn("toggle-btn", draft.is_required ? "toggle-btn-active" : "")}
          >
            <span>必須項目にする</span>
            <div className={cn("toggle-btn-switch", draft.is_required ? "toggle-btn-switch-active" : "")}>
              <span className={cn("toggle-btn-switch-handle", draft.is_required ? "toggle-btn-switch-handle-active" : "")} />
            </div>
          </button>
        </div>
      </div>
      <div>
        <label className="label">タイプ</label>
        <select
          className="select mt-1"
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value as FieldType })}
        >
          <option value="text">テキスト</option>
          <option value="email">メール</option>
          <option value="tel">電話番号</option>
          <option value="multiline">複数行テキスト</option>
          <option value="url">URL</option>
          <option value="file">ファイル</option>
        </select>
      </div>
      <div>
        <label className="label">プレースホルダー</label>
        <input
          type="text"
          className="input mt-1"
          value={draft.placeholder}
          onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
          placeholder="入力例を記入（任意）"
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="btn btn-ghost">キャンセル</button>
        <button onClick={handleSave} className="btn btn-primary">
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

function FormTab({ fields, eventId, onDirtyChange }: { fields: CustomField[]; eventId: string; onDirtyChange: (dirty: boolean) => void }) {
  const toast = useToast();

  const [localFields, setLocalFields] = useState<CustomField[]>(
    [...fields].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState<FieldDraft>({ ...EMPTY_FIELD_DRAFT });
  const [editDraft, setEditDraft] = useState<FieldDraft>({ ...EMPTY_FIELD_DRAFT });
  const [saving, setSaving] = useState(false);

  const sensors = useDndSensors();

  function handleFieldDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalFields((fields) => {
        const oldIndex = fields.findIndex((f) => f.id === active.id);
        const newIndex = fields.findIndex((f) => f.id === over.id);
        return arrayMove(fields, oldIndex, newIndex).map((f, i) => ({
          ...f,
          sort_order: i + 1,
        }));
      });
    }
  }

  function handleAddField() {
    const maxOrder = localFields.reduce((max, f) => Math.max(max, f.sort_order), 0);
    const newField: CustomField = {
      id: generateId(),
      event_id: eventId,
      label: addDraft.label,
      type: addDraft.type,
      placeholder: addDraft.placeholder || undefined,
      is_required: addDraft.is_required,
      sort_order: maxOrder + 1,
    };
    setLocalFields([...localFields, newField]);
    setAddDraft({ ...EMPTY_FIELD_DRAFT });
    setShowAddForm(false);
    onDirtyChange(true);
  }

  function handleEditStart(field: CustomField) {
    setEditingId(field.id);
    setEditDraft({
      label: field.label,
      type: field.type,
      placeholder: field.placeholder ?? "",
      is_required: field.is_required,
    });
  }

  function handleEditSave(fieldId: string) {
    setLocalFields(
      localFields.map((f) =>
        f.id !== fieldId
          ? f
          : {
            ...f,
            label: editDraft.label,
            type: editDraft.type,
            placeholder: editDraft.placeholder || undefined,
            is_required: editDraft.is_required,
          }
      )
    );
    setEditingId(null);
    onDirtyChange(true);
  }

  function handleDelete(fieldId: string) {
    setLocalFields(localFields.filter((f) => f.id !== fieldId));
    onDirtyChange(true);
  }

  async function handleSaveAll() {
    if (showAddForm || editingId !== null) {
      toast.error("編集中のフォームを保存またはキャンセルしてから保存してください");
      return;
    }
    setSaving(true);
    try {
      await updateEventTypeApi(eventId, { custom_fields: localFields });
      toast.success("変更を保存しました");
      onDirtyChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // no renderFieldForm - replaced by FieldForm component below

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">フォーム項目</h3>
          <p className="mt-1 text-sm text-gray-500">
            候補者に入力してもらう項目を設定します
          </p>
        </div>
      </div>

      {/* Default fields (always shown) */}
      <div className="mb-4 space-y-2">
        <p className="label">
          デフォルト項目（変更不可）
        </p>
        {[
          { label: "お名前", type: "text", required: true },
          { label: "メールアドレス", type: "email", required: true },
          { label: "電話番号", type: "tel", required: true },
        ].map((field) => (
          <div
            key={field.label}
            className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
          >
            <span className="text-sm font-medium text-gray-500">{field.label}</span>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                {FIELD_TYPE_LABELS[field.type as FieldType]}
              </span>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">
                必須
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Custom fields */}

      <div className="space-y-2">
        <p className="label">
          カスタム項目
        </p>
        {localFields.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFieldDragEnd}
          >
            <SortableContext
              items={localFields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {localFields.map((field) => (
                <div key={field.id} className="mb-2">
                  {editingId === field.id ? (
                    <FieldForm
                      draft={editDraft}
                      setDraft={setEditDraft}
                      onSave={() => handleEditSave(field.id)}
                      onCancel={() => setEditingId(null)}
                      saveLabel="保存"
                      existingLabels={localFields.filter((f) => f.id !== field.id).map((f) => f.label)}
                    />
                  ) : (
                    <SortableRow id={field.id}>
                      {(handle) => (
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                          <div className="flex items-center gap-3">
                            {handle}
                            <span className="text-sm font-medium text-gray-700">{field.label}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {FIELD_TYPE_LABELS[field.type] || field.type}
                            </span>
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-xs",
                              field.is_required ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
                            )}>
                              {field.is_required ? "必須" : "任意"}
                            </span>
                            <button
                              onClick={() => handleEditStart(field)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="編集"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(field.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </SortableRow>
                  )}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>


      {/* Add form */}
      {showAddForm && (
        <FieldForm
          draft={addDraft}
          setDraft={setAddDraft}
          onSave={handleAddField}
          onCancel={() => { setShowAddForm(false); setAddDraft({ ...EMPTY_FIELD_DRAFT }); }}
          saveLabel="追加"
          existingLabels={localFields.map((f) => f.label)}
        />
      )}

      {!showAddForm && (
        <button onClick={() => setShowAddForm(true)} className="add-btn mt-2">
          <Plus className="h-4 w-4" />
          項目を追加
        </button>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={handleSaveAll} disabled={saving} className="btn btn-primary">
          {saving && <span className="spinner" />}
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </div>
    </div>
  );
}

// --- Reminder Tab ---

type ReminderDraft = {
  channel: ReminderChannel;
  timing: { value: number; unit: "hours" | "days" };
  message: string;
};

const EMPTY_REMINDER_DRAFT: ReminderDraft = {
  channel: "email",
  timing: { value: 24, unit: "hours" },
  message: "",
};

function ReminderFormInner({
  draft,
  setDraft,
  onSave,
  onCancel,
  saveLabel = "保存",
  locationPreview,
}: {
  draft: ReminderDraft;
  setDraft: (d: ReminderDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  locationPreview?: React.ReactNode;
}) {
  const timingLabel = `${draft.timing.value}${draft.timing.unit === "hours" ? "時間前" : "日前"}`;

  return (
    <div className="mt-3 space-y-3 bg-hilight rounded-2xl border border-primary-200 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">タイミング（数値）</label>
          <input
            type="number"
            className="input mt-1"
            min={1}
            value={draft.timing.value}
            onChange={(e) =>
              setDraft({ ...draft, timing: { ...draft.timing, value: parseInt(e.target.value) || 1 } })
            }
          />
        </div>
        <div>
          <label className="label">単位</label>
          <select
            className="select mt-1"
            value={draft.timing.unit}
            onChange={(e) =>
              setDraft({ ...draft, timing: { ...draft.timing, unit: e.target.value as "hours" | "days" } })
            }
          >
            <option value="hours">時間前</option>
            <option value="days">日前</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">メッセージ内容</label>
        <div className="mt-1 rounded-2xl border border-gray-200 overflow-hidden">
          {/* プレビューヘッダー */}
          <div className="bg-gray-50 px-4 py-3 text-xs text-gray-500 border-b border-gray-100">
            <p>田中 太郎 様</p>
            <p className="mt-1">面接の <span className="font-medium text-gray-700">{timingLabel}</span> になりましたので、再度ご連絡いたします。</p>
          </div>
          {/* 編集エリア */}
          <textarea
            className="w-full px-4 py-3 text-sm resize-y focus:outline-none min-h-[80px]"
            placeholder="候補者に送るメッセージを入力してください"
            value={draft.message}
            onChange={(e) => setDraft({ ...draft, message: e.target.value })}
          />
          {/* プレビューフッター */}
          <div className="bg-gray-50 px-4 py-3 text-xs text-gray-500 border-t border-gray-100 space-y-1">
            <p className="font-medium text-gray-700">面接情報</p>
            <p>日時　2026年4月1日水曜日 11:00 〜 12:00</p>
            <p>主催　株式会社KOHEI</p>
            {locationPreview}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn btn-ghost">
          キャンセル
        </button>
        <button onClick={onSave} className="btn btn-primary">
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

function ReminderTab({
  eventId,
  reminders: initialReminders,
  onDirtyChange,
  locationType,
  locationDetail,
}: {
  eventId: string;
  reminders: ReminderSetting[];
  onDirtyChange: (dirty: boolean) => void;
  locationType?: string;
  locationDetail?: string | null;
}) {
  const toast = useToast();
  const [reminders, setReminders] = useState<ReminderSetting[]>(initialReminders);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState<ReminderDraft>({ ...EMPTY_REMINDER_DRAFT });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ReminderDraft>({ ...EMPTY_REMINDER_DRAFT });
  const [saving, setSaving] = useState(false);

  function handleAddSave() {
    setReminders([
      ...reminders,
      {
        id: generateId(),
        channel: addDraft.channel,
        timing: addDraft.timing,
        message: addDraft.message,
        is_enabled: true,
      },
    ]);
    setAddDraft({ ...EMPTY_REMINDER_DRAFT });
    setShowAddForm(false);
    onDirtyChange(true);
  }

  function handleEditStart(reminder: ReminderSetting) {
    setEditingId(reminder.id);
    setEditDraft({ channel: reminder.channel, timing: { ...reminder.timing }, message: reminder.message });
  }

  function handleEditSave(id: string) {
    updateReminder(id, { channel: editDraft.channel, timing: editDraft.timing, message: editDraft.message });
    setEditingId(null);
  }

  function removeReminder(id: string) {
    setReminders(reminders.filter((r) => r.id !== id));
    onDirtyChange(true);
  }

  function updateReminder(id: string, updates: Partial<ReminderSetting>) {
    setReminders(reminders.map((r) => r.id === id ? { ...r, ...updates } : r));
    onDirtyChange(true);
  }

  async function handleSave() {
    if (showAddForm || editingId !== null) {
      toast.error("編集中のフォームを保存またはキャンセルしてから保存してください");
      return;
    }
    setSaving(true);
    try {
      await updateEventTypeApi(eventId, { reminder_settings: reminders });
      toast.success("リマインド設定を保存しました");
      onDirtyChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const locationPreview = (() => {
    if (locationType === "online") {
      return locationDetail
        ? <p>参加リンク　<span className="text-blue-500 underline">{locationDetail}</span></p>
        : <p>参加リンク　<span className="text-blue-500">https://meet.google.com/XXX-XXX-XXX</span></p>;
    }
    if (locationType === "in-person") {
      return locationDetail
        ? <p>場所　{locationDetail}</p>
        : <p>場所　<span className="text-gray-400">（対面）</span></p>;
    }
    if (locationType === "phone") {
      return locationDetail
        ? <p>電話　{locationDetail}</p>
        : <p>電話</p>;
    }
    return <p className="text-gray-400">（場所未設定）</p>;
  })();

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-bold">リマインド設定</h3>
        <p className="mt-1 text-sm text-gray-500">
          候補者へのリマインドメールを設定します
        </p>
      </div>

      <div className="space-y-3">
        {reminders.map((reminder) => (
          <div key={reminder.id}>
            {editingId === reminder.id ? (
              <ReminderFormInner
                draft={editDraft}
                setDraft={setEditDraft}
                onSave={() => handleEditSave(reminder.id)}
                onCancel={() => setEditingId(null)}
                saveLabel="保存"
                locationPreview={locationPreview}
              />
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 p-4">
                <div>
                  <p className="text-sm font-medium">
                    メール
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {reminder.timing.value}{reminder.timing.unit === "hours" ? "時間前" : "日前"}
                    {reminder.message && (
                      <span> · {reminder.message.length > 30 ? `${reminder.message.slice(0, 30)}…` : reminder.message}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleEditStart(reminder)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="編集"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeReminder(reminder.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {showAddForm && (
          <ReminderFormInner
            draft={addDraft}
            setDraft={setAddDraft}
            onSave={handleAddSave}
            onCancel={() => { setShowAddForm(false); setAddDraft({ ...EMPTY_REMINDER_DRAFT }); }}
            saveLabel="追加"
            locationPreview={locationPreview}
          />
        )}

        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="add-btn">
            <Plus className="h-4 w-4" />
            リマインドを追加
          </button>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving && <span className="spinner" />}
          {saving ? "保存中..." : "変更を保存"}
        </button>
      </div>
    </div>
  );
}
