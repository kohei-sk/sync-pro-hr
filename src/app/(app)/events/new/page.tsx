"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Video,
  MapPin,
  Phone,
  Lock,
  Plus,
  Trash2,
  Globe,
  EyeOff,
  ChevronDown,
  GripVertical,
  Pencil,
  FileText,
  Bell,
  Mail,
  MessageSquare,
  Clock,
  CalendarDays,
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
import Link from "next/link";
import { cn, generateId } from "@/lib/utils";
import { createEventTypeApi, useEventTypes } from "@/lib/event-store";
import { useToast } from "@/components/ui/Toast";
import { FieldError } from "@/components/ui/FieldError";
import { PageLoader } from "@/components/ui/PageLoader";
import { useTeamMembers } from "@/lib/hooks/useTeamMembers";
import { WEEKDAY_LABELS, DEFAULT_ALLOWED_DAYS } from "@/lib/constants";
import type { ExclusionRule, CustomField } from "@/types";

type Step = "basic" | "options" | "confirm";

type NewExclusionRule = {
  id: string;
  name: string;
  type: "all-day" | "time-range";
  day_of_week?: number;
  specific_date?: string;
  start_time?: string;
  end_time?: string;
  recurring: boolean;
};

type ExclusionDraft = Omit<NewExclusionRule, "id">;

type FieldType = "text" | "email" | "tel" | "multiline" | "url" | "file";

type NewFieldDraft = {
  label: string;
  type: FieldType;
  placeholder: string;
  is_required: boolean;
};

type NewCustomField = NewFieldDraft & { id: string };

const EMPTY_FIELD_DRAFT: NewFieldDraft = {
  label: "",
  type: "text",
  placeholder: "",
  is_required: false,
};

type NewRole = {
  id: string;
  name: string;
  required_count: number;
  memberIds: string[];
};

type ReminderChannel = "email";
type ReminderUnit = "hours" | "days";

type NewReminder = {
  id: string;
  channel: ReminderChannel;
  timing_value: number;
  timing_unit: ReminderUnit;
  message: string;
  is_enabled: boolean;
};

type ReminderDraft = {
  channel: ReminderChannel;
  timing_value: number;
  timing_unit: ReminderUnit;
  message: string;
};

const EMPTY_REMINDER_DRAFT: ReminderDraft = {
  channel: "email",
  timing_value: 24,
  timing_unit: "hours",
  message: "",
};

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

export default function NewEventPage() {
  const router = useRouter();
  const toast = useToast();
  const { members: teamMembers, loading: membersLoading } = useTeamMembers();
  const [creating, setCreating] = useState(false);
  const { eventTypes } = useEventTypes();
  const existingTitles = eventTypes.map((e) => e.title);
  const [step, setStep] = useState<Step>("basic");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 60,
    buffer_before: 15,
    buffer_after: 15,
    location_type: "online" as "online" | "in-person" | "phone",
    location_detail: "",
    onlineMeetType: "meet" as "meet" | "other",
    scheduling_mode: "weekday" as "pool" | "fixed" | "weekday",
    color: "#3b82f6",
    isPublic: true,
  });

  // 受付設定
  const [receptionSettings, setReceptionSettings] = useState({
    excludeOutsideHours: true,
    allowedDays: [...DEFAULT_ALLOWED_DAYS],
    acceptHolidays: false,
  });
  const [bookingWindowStart, setBookingWindowStart] = useState<{ value: number; unit: "days" | "weeks" | "months" }>({ value: 3, unit: "days" });
  const [bookingWindowEnd, setBookingWindowEnd] = useState<{ value: number; unit: "days" | "weeks" | "months" }>({ value: 2, unit: "weeks" });

  // 曜日モード
  const [weekdaySchedule, setWeekdaySchedule] = useState<{ dayIndex: number; memberIds: string[]; requiredCount: number }[]>([]);
  const [weekdayMemberDropdownOpen, setWeekdayMemberDropdownOpen] = useState<number | null>(null);

  const [roles, setRoles] = useState<NewRole[]>([
    { id: "role-1", name: "面接官", required_count: 1, memberIds: [] },
  ]);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState<string | null>(null);
  const [fixedMemberIds, setFixedMemberIds] = useState<string[]>([]);
  const [fixedMemberDropdownOpen, setFixedMemberDropdownOpen] = useState(false);

  const [newExclusionRules, setNewExclusionRules] = useState<NewExclusionRule[]>([]);
  const [showExclusionForm, setShowExclusionForm] = useState(false);
  const [exclusionDraft, setExclusionDraft] = useState<ExclusionDraft>({
    name: "",
    type: "all-day",
    recurring: true,
    day_of_week: undefined,
    specific_date: "",
    start_time: "09:00",
    end_time: "10:00",
  });
  const [editingExclusionId, setEditingExclusionId] = useState<string | null>(null);
  const [editExclusionDraft, setEditExclusionDraft] = useState<ExclusionDraft>({
    name: "",
    type: "all-day",
    recurring: true,
    day_of_week: undefined,
    specific_date: "",
    start_time: "09:00",
    end_time: "10:00",
  });

  // フォームフィールド
  const [formFields, setFormFields] = useState<NewCustomField[]>([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<NewFieldDraft>({ ...EMPTY_FIELD_DRAFT });
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldDraft, setEditFieldDraft] = useState<NewFieldDraft>({ ...EMPTY_FIELD_DRAFT });

  const [reminders, setReminders] = useState<NewReminder[]>([]);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderDraft, setReminderDraft] = useState<ReminderDraft>({ ...EMPTY_REMINDER_DRAFT });
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editReminderDraft, setEditReminderDraft] = useState<ReminderDraft>({ ...EMPTY_REMINDER_DRAFT });

  const steps: { id: Step; label: string }[] = [
    { id: "basic", label: "基本設定" },
    { id: "options", label: "オプション" },
    { id: "confirm", label: "確認" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  function handleNext() {
    if (step === "basic") {
      // 全フィールドを touched にして検証
      const enabledDaysList = WEEKDAY_LABELS.map((_, i) => i).filter((i) => receptionSettings.allowedDays[i]);
      const keys = [
        "title",
        "location_detail",
        "allowedDays",
        "bookingWindow",
        ...enabledDaysList.map((i) => `weekday_${i}`),
        "fixedMembers",
        ...roles.flatMap((r) => [`role_${r.id}_name`, `role_${r.id}_members`]),
      ];
      touchAll(keys);
      if (hasBasicErrors()) return;
    } else if (step === "options") {
      // 展開中フォームがある場合はブロック
      if (showExclusionForm || showFieldForm || showReminderForm) {
        toast.error("編集中のフォームを保存またはキャンセルしてから次へ進んでください");
        return;
      }
    }
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

  // ステップ切替時にスクロール位置をリセット
  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
  }, [step]);

  // --- バリデーション helpers ---
  function touch(key: string) {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }

  function touchAll(keys: string[]) {
    setTouched((prev) => {
      const next = { ...prev };
      keys.forEach((k) => { next[k] = true; });
      return next;
    });
  }

  function getTitleError(): string | undefined {
    if (!formData.title.trim()) return "イベント名を入力してください";
    if (existingTitles.includes(formData.title.trim())) return "同じ名前のイベントが既に存在します";
    return undefined;
  }

  function getLocationDetailError(): string | undefined {
    const needsDetail = formData.location_type !== "online" || formData.onlineMeetType === "other";
    if (needsDetail && !formData.location_detail.trim()) return "場所の詳細を入力してください";
    return undefined;
  }

  function getAllowedDaysError(): string | undefined {
    if (receptionSettings.allowedDays.every((d) => !d)) return "1日以上選択してください";
    return undefined;
  }

  function toAbsoluteDays(value: number, unit: string): number {
    if (unit === "weeks") return value * 7;
    if (unit === "months") return value * 30;
    return value;
  }

  function getBookingWindowError(): string | undefined {
    const startDays = toAbsoluteDays(bookingWindowStart.value, bookingWindowStart.unit);
    const endDays = toAbsoluteDays(bookingWindowEnd.value, bookingWindowEnd.unit);
    if (endDays <= startDays) return "「受付終了」は「受付開始」より後にしてください";
    return undefined;
  }

  function getWeekdayMemberError(dayIndex: number): string | undefined {
    const entry = weekdaySchedule.find((e) => e.dayIndex === dayIndex);
    const memberIds = entry?.memberIds ?? [];
    const requiredCount = entry?.requiredCount ?? 1;
    if (memberIds.length === 0) return "メンバーを1人以上追加してください";
    if (requiredCount > memberIds.length) return "必要人数が登録人数を超えています";
    return undefined;
  }

  function getFixedMembersError(): string | undefined {
    if (fixedMemberIds.length === 0) return "メンバーを1人以上追加してください";
    return undefined;
  }

  function getRoleNameError(roleId: string): string | undefined {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return undefined;
    if (!role.name.trim()) return "役割名を入力してください";
    return undefined;
  }

  function getRoleMembersError(roleId: string): string | undefined {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return undefined;
    if (role.memberIds.length === 0) return "メンバーを1人以上追加してください";
    if (role.required_count > role.memberIds.length) return "必要人数が登録人数を超えています";
    return undefined;
  }

  function getExclusionNameError(name: string, excludeId?: string): string | undefined {
    if (!name.trim()) return "ルール名を入力してください";
    const isDuplicate = newExclusionRules.some((r) => r.id !== excludeId && r.name === name.trim());
    if (isDuplicate) return "同じ名前のルールが既に存在します";
    return undefined;
  }

  function getExclusionDateError(draft: ExclusionDraft): string | undefined {
    if (!draft.recurring && !draft.specific_date) return "対象日を選択してください";
    return undefined;
  }

  function getFieldLabelError(label: string, excludeId?: string): string | undefined {
    if (!label.trim()) return "ラベル名を入力してください";
    const isDuplicate = formFields.some((f) => f.id !== excludeId && f.label === label.trim());
    if (isDuplicate) return "同じラベル名が既に存在します";
    return undefined;
  }

  function getReminderMessageError(_message: string): string | undefined {
    return undefined;
  }

  function hasBasicErrors(): boolean {
    if (getTitleError()) return true;
    if (getLocationDetailError()) return true;
    if (getAllowedDaysError()) return true;
    if (getBookingWindowError()) return true;
    if (formData.scheduling_mode === "weekday") {
      const enabledDaysList = WEEKDAY_LABELS.map((_, i) => i).filter((i) => receptionSettings.allowedDays[i]);
      if (enabledDaysList.some((i) => getWeekdayMemberError(i))) return true;
    }
    if (formData.scheduling_mode === "fixed" && getFixedMembersError()) return true;
    if (formData.scheduling_mode === "pool") {
      if (roles.some((r) => getRoleNameError(r.id) || getRoleMembersError(r.id))) return true;
    }
    return false;
  }

  function hasExclusionDraftErrors(): boolean {
    return !!(getExclusionNameError(exclusionDraft.name) || getExclusionDateError(exclusionDraft));
  }

  function hasFieldDraftErrors(): boolean {
    return !!getFieldLabelError(fieldDraft.label);
  }

  function hasReminderDraftErrors(): boolean {
    return !!getReminderMessageError(reminderDraft.message);
  }

  function hasOptionsExpandedErrors(): boolean {
    if (showExclusionForm && hasExclusionDraftErrors()) return true;
    if (showFieldForm && hasFieldDraftErrors()) return true;
    if (showReminderForm && hasReminderDraftErrors()) return true;
    return false;
  }

  async function handleCreate() {
    setCreating(true);
    try {
      await createEventTypeApi({
        title: formData.title,
        description: formData.description || undefined,
        duration: formData.duration,
        buffer_before: formData.buffer_before,
        buffer_after: formData.buffer_after,
        location_type: formData.location_type,
        location_detail:
          formData.location_type === "online" && formData.onlineMeetType === "meet"
            ? undefined
            : formData.location_detail || undefined,
        status: formData.isPublic ? "active" : "draft",
        scheduling_mode: formData.scheduling_mode,
        color: formData.color,
        reception_settings: {
          exclude_outside_hours: receptionSettings.excludeOutsideHours,
          allowed_days: receptionSettings.allowedDays,
          accept_holidays: receptionSettings.acceptHolidays,
          booking_window_start: bookingWindowStart,
          booking_window_end: bookingWindowEnd,
        },
        weekday_schedule: formData.scheduling_mode === "weekday"
          ? weekdaySchedule.map((entry) => ({
            day_index: entry.dayIndex,
            member_ids: entry.memberIds,
            required_count: entry.requiredCount ?? 1,
          }))
          : undefined,
        roles: formData.scheduling_mode !== "weekday"
          ? (formData.scheduling_mode === "fixed"
            ? [{ name: "面接官", required_count: fixedMemberIds.length || 1, priority_order: 1, member_ids: fixedMemberIds }]
            : roles.map((r, idx) => ({
              name: r.name || "面接官",
              required_count: r.required_count,
              priority_order: idx + 1,
              member_ids: r.memberIds,
            })))
          : [],
        exclusion_rules: newExclusionRules,
        custom_fields: formFields,
        reminder_settings: reminders.map((r) => ({
          channel: r.channel,
          timing: { value: r.timing_value, unit: r.timing_unit },
          message: r.message,
          is_enabled: r.is_enabled,
        })),
      });
      toast.success("イベントを作成しました");
      router.push("/events");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }


  function addRole() {
    setRoles([
      ...roles,
      {
        id: `role-${Date.now()}`,
        name: "",
        required_count: 1,
        memberIds: [],
      },
    ]);
  }

  function removeRole(roleId: string) {
    setRoles(roles.filter((r) => r.id !== roleId));
  }

  function updateRole(roleId: string, updates: Partial<NewRole>) {
    setRoles(roles.map((r) => (r.id === roleId ? { ...r, ...updates } : r)));
    if ("name" in updates) touch(`role_${roleId}_name`);
  }

  function addMemberToRole(roleId: string, userId: string) {
    setRoles(
      roles.map((r) => {
        if (r.id !== roleId) return r;
        if (r.memberIds.includes(userId)) return r;
        return { ...r, memberIds: [...r.memberIds, userId] };
      })
    );
    setMemberDropdownOpen(null);
    touch(`role_${roleId}_members`);
  }

  function removeMemberFromRole(roleId: string, userId: string) {
    setRoles(
      roles.map((r) => {
        if (r.id !== roleId) return r;
        return { ...r, memberIds: r.memberIds.filter((id) => id !== userId) };
      })
    );
    touch(`role_${roleId}_members`);
  }

  function addFixedMember(userId: string) {
    if (!fixedMemberIds.includes(userId)) {
      setFixedMemberIds([...fixedMemberIds, userId]);
    }
    setFixedMemberDropdownOpen(false);
    touch("fixedMembers");
  }

  function removeFixedMember(userId: string) {
    setFixedMemberIds(fixedMemberIds.filter((id) => id !== userId));
    touch("fixedMembers");
  }

  function handleAddReminder() {
    touchAll(["reminderMessage"]);
    if (hasReminderDraftErrors()) return;
    setReminders([...reminders, { id: generateId(), ...reminderDraft, is_enabled: true }]);
    setReminderDraft({ ...EMPTY_REMINDER_DRAFT });
    setTouched((prev) => { const next = { ...prev }; delete next.reminderMessage; return next; });
    setShowReminderForm(false);
  }

  function startEditReminder(reminder: NewReminder) {
    setEditingReminderId(reminder.id);
    setEditReminderDraft({ channel: reminder.channel, timing_value: reminder.timing_value, timing_unit: reminder.timing_unit, message: reminder.message });
  }

  function saveEditReminder(id: string) {
    setReminders(reminders.map((r) => r.id === id ? { ...r, ...editReminderDraft } : r));
    setEditingReminderId(null);
  }

  function addExclusionRule() {
    touchAll(["exclusionName", "exclusionDate"]);
    if (hasExclusionDraftErrors()) return;
    setNewExclusionRules([
      ...newExclusionRules,
      { ...exclusionDraft, id: generateId() },
    ]);
    setExclusionDraft({
      name: "",
      type: "all-day",
      recurring: true,
      day_of_week: undefined,
      specific_date: "",
      start_time: "09:00",
      end_time: "10:00",
    });
    setTouched((prev) => { const next = { ...prev }; delete next.exclusionName; delete next.exclusionDate; return next; });
    setShowExclusionForm(false);
  }

  function removeExclusionRule(id: string) {
    setNewExclusionRules(newExclusionRules.filter((r) => r.id !== id));
  }

  function startEditExclusionRule(rule: NewExclusionRule) {
    setEditingExclusionId(rule.id);
    setEditExclusionDraft({
      name: rule.name,
      type: rule.type,
      recurring: rule.recurring,
      day_of_week: rule.day_of_week,
      specific_date: rule.specific_date ?? "",
      start_time: rule.start_time ?? "09:00",
      end_time: rule.end_time ?? "10:00",
    });
  }

  function saveEditExclusionRule(id: string) {
    setNewExclusionRules(
      newExclusionRules.map((r) =>
        r.id !== id
          ? r
          : { ...r, ...editExclusionDraft }
      )
    );
    setEditingExclusionId(null);
  }

  // フォームフィールド操作
  function addFormField() {
    touchAll(["fieldLabel"]);
    if (hasFieldDraftErrors()) return;
    setFormFields([...formFields, { ...fieldDraft, id: generateId() }]);
    setFieldDraft({ ...EMPTY_FIELD_DRAFT });
    setTouched((prev) => { const next = { ...prev }; delete next.fieldLabel; return next; });
    setShowFieldForm(false);
  }

  function startEditFormField(field: NewCustomField) {
    setEditingFieldId(field.id);
    setEditFieldDraft({
      label: field.label,
      type: field.type,
      placeholder: field.placeholder,
      is_required: field.is_required,
    });
  }

  function saveEditFormField(id: string) {
    setFormFields(formFields.map((f) => f.id !== id ? f : { ...f, ...editFieldDraft }));
    setEditingFieldId(null);
  }

  function removeFormField(id: string) {
    setFormFields(formFields.filter((f) => f.id !== id));
  }

  // DnD sensors
  const sensors = useDndSensors();

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

  function handleRoleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRoles((roles) => {
        const oldIndex = roles.findIndex((r) => r.id === active.id);
        const newIndex = roles.findIndex((r) => r.id === over.id);
        return arrayMove(roles, oldIndex, newIndex);
      });
    }
  }

  function handleRoleMemberDragEnd(event: DragEndEvent, roleId: string) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRoles((roles) =>
        roles.map((r) => {
          if (r.id !== roleId) return r;
          const oldIndex = r.memberIds.indexOf(active.id as string);
          const newIndex = r.memberIds.indexOf(over.id as string);
          return { ...r, memberIds: arrayMove(r.memberIds, oldIndex, newIndex) };
        })
      );
    }
  }

  // 受付設定: 曜日トグル
  function toggleAllowedDay(dayIndex: number) {
    const updated = [...receptionSettings.allowedDays];
    updated[dayIndex] = !updated[dayIndex];
    setReceptionSettings({ ...receptionSettings, allowedDays: updated });
    touch("allowedDays");
  }

  // 曜日モード: メンバー追加
  function addWeekdayMember(dayIndex: number, userId: string) {
    setWeekdaySchedule((prev) => {
      const existing = prev.find((e) => e.dayIndex === dayIndex);
      if (existing) {
        if (existing.memberIds.includes(userId)) return prev;
        return prev.map((e) => e.dayIndex === dayIndex ? { ...e, memberIds: [...e.memberIds, userId] } : e);
      }
      return [...prev, { dayIndex, memberIds: [userId], requiredCount: 1 }];
    });
    setWeekdayMemberDropdownOpen(null);
    touch(`weekday_${dayIndex}`);
  }

  // 曜日モード: 必要人数更新
  function updateWeekdayRequiredCount(dayIndex: number, count: number) {
    setWeekdaySchedule((prev) => {
      const existing = prev.find((e) => e.dayIndex === dayIndex);
      if (existing) {
        return prev.map((e) => e.dayIndex === dayIndex ? { ...e, requiredCount: count } : e);
      }
      return [...prev, { dayIndex, memberIds: [], requiredCount: count }];
    });
    touch(`weekday_${dayIndex}`);
  }

  // 曜日モード: メンバー削除
  function removeWeekdayMember(dayIndex: number, userId: string) {
    setWeekdaySchedule((prev) =>
      prev.map((e) => e.dayIndex === dayIndex ? { ...e, memberIds: e.memberIds.filter((id) => id !== userId) } : e)
    );
    touch(`weekday_${dayIndex}`);
  }

  // 曜日モード: メンバー並び替え
  function handleWeekdayMemberDragEnd(event: DragEndEvent, dayIndex: number) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWeekdaySchedule((prev) =>
        prev.map((e) => {
          if (e.dayIndex !== dayIndex) return e;
          const activeId = (active.id as string).replace(`${dayIndex}-`, "");
          const overId = (over.id as string).replace(`${dayIndex}-`, "");
          const oldIndex = e.memberIds.indexOf(activeId);
          const newIndex = e.memberIds.indexOf(overId);
          return { ...e, memberIds: arrayMove(e.memberIds, oldIndex, newIndex) };
        })
      );
    }
  }

  // 有効な曜日一覧（曜日モードUI用）
  const enabledDays = WEEKDAY_LABELS
    .map((label, i) => ({ label, dayIndex: i }))
    .filter((_, i) => receptionSettings.allowedDays[i]);

  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#06b6d4",
    "#6b7280",
  ];

  const totalMembers = formData.scheduling_mode === "weekday"
    ? new Set(weekdaySchedule.flatMap((e) => e.memberIds)).size
    : formData.scheduling_mode === "fixed"
      ? fixedMemberIds.length
      : roles.reduce((acc, r) => acc + r.memberIds.length, 0);

  return (
    <div>
      {/* Header */}
      <header className="header mb-7">
        <Link
          href="/events"
          className="header-back-btn"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="header-col">
          <h1 className="header-title">
            新規イベント作成
          </h1>
        </div>
      </header>

      {/* Step indicator */}
      <div className="mb-7">
        <div className="flex items-center gap-3.5">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3.5">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
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
                  i <= currentStepIndex ? "text-[#212529]" : "text-gray-400"
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
      <div className="mb-[64px]">
        {/* Step 1: Basic Settings + Team */}
        {step === "basic" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="step-section-title">基本設定</h2>
              <p className="mt-1 text-sm text-gray-500">
                イベントの基本情報を入力してください
              </p>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="label">イベント名</label>
                  <input
                    type="text"
                    className={cn("input mt-1", touched.title && getTitleError() && "input-error")}
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      touch("title");
                    }}
                    onBlur={() => touch("title")}
                    placeholder="例: エンジニア一次面接"
                  />
                  {touched.title && <FieldError message={getTitleError()} />}
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
                <div>
                  <label className="label">カラー</label>
                  <div className="mt-2 flex gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setFormData({ ...formData, color: c })}
                        className={cn(
                          "h-8 w-8 rounded-full transition-all",
                          formData.color === c
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
                      {
                        type: "online" as const,
                        icon: Video,
                        label: "オンライン",
                      },
                      {
                        type: "in-person" as const,
                        icon: MapPin,
                        label: "対面",
                      },
                      { type: "phone" as const, icon: Phone, label: "電話" },
                    ].map((loc) => (
                      <button
                        key={loc.type}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            location_type: loc.type,
                            onlineMeetType: "meet",
                            location_detail: "",
                          })
                        }
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ring-1 transition-colors h-[42px]",
                          formData.location_type === loc.type
                            ? "bg-primary-50 text-primary-700 ring-primary-300"
                            : "text-gray-600 ring-gray-200 hover:ring-gray-300"
                        )}
                      >
                        <loc.icon className="h-4 w-4" />
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>
                {formData.location_type === "online" && (
                  <div className="flex gap-3">
                    {[
                      { value: "meet" as const, label: "Google Meet（自動生成）" },
                      { value: "other" as const, label: "その他" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            onlineMeetType: opt.value,
                            location_detail: "",
                          })
                        }
                        className={cn(
                          "tracking-tight rounded-lg px-2 py-1.5 text-xs font-medium ring-1 transition-colors",
                          formData.onlineMeetType === opt.value
                            ? "bg-primary-50 text-primary-700 ring-primary-300"
                            : "text-gray-600 ring-gray-200 hover:ring-gray-300"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {formData.location_type && (formData.location_type !== "online" || formData.onlineMeetType === "other") && (
                  <div>
                    <label className="label">場所の詳細</label>
                    <input
                      type="text"
                      className={cn("input mt-1", touched.location_detail && getLocationDetailError() && "input-error")}
                      value={formData.location_detail}
                      onChange={(e) => {
                        setFormData({ ...formData, location_detail: e.target.value });
                        touch("location_detail");
                      }}
                      onBlur={() => touch("location_detail")}
                      placeholder={
                        formData.location_type === "online"
                          ? "Zoom URL など"
                          : formData.location_type === "in-person"
                            ? "会議室名や住所"
                            : "電話番号"
                      }
                    />
                    {touched.location_detail && <FieldError message={getLocationDetailError()} />}
                  </div>
                )}

                {/* Visibility */}
                <div>
                  <label className="label">公開設定</label>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, isPublic: true })}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                        formData.isPublic
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <Globe className={cn("h-5 w-5", formData.isPublic ? "text-green-600" : "text-gray-400")} />
                      <div>
                        <p className={cn("font-semibold text-sm", formData.isPublic ? "text-green-800" : "text-gray-700")}>公開</p>
                        <p className="text-xs text-gray-500">候補者が予約できます</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, isPublic: false })}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                        !formData.isPublic
                          ? "border-gray-500 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <EyeOff className={cn("h-5 w-5", !formData.isPublic ? "text-gray-600" : "text-gray-400")} />
                      <div>
                        <p className={cn("font-semibold text-sm", !formData.isPublic ? "text-gray-800" : "text-gray-700")}>非公開</p>
                        <p className="text-xs text-gray-500">下書き状態で保存します</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 受付設定 */}
            <div className="card">
              <h2 className="step-section-title">受付設定</h2>
              <p className="mt-1 text-sm text-gray-500">
                予約を受け付ける時間・曜日・期間を設定します
              </p>
              <div className="mt-6 space-y-6">
                {/* 時間設定 */}
                <div>
                  <label className="label">時間設定</label>
                  <button
                    type="button"
                    className={cn("toggle-btn w-[250px] mt-1", receptionSettings.excludeOutsideHours && "toggle-btn-active")}
                    onClick={() => setReceptionSettings({ ...receptionSettings, excludeOutsideHours: !receptionSettings.excludeOutsideHours })}
                  >
                    <span>営業時間外は受け付けない</span>
                    <span className={cn("toggle-btn-switch", receptionSettings.excludeOutsideHours && "toggle-btn-switch-active")}>
                      <span className={cn("toggle-btn-switch-handle", receptionSettings.excludeOutsideHours && "toggle-btn-switch-handle-active")} />
                    </span>
                  </button>
                </div>
                {/* 曜日設定 */}
                <div>
                  <label className="label">曜日設定</label>
                  <div className="mt-1">
                    <div className="flex flex-wrap gap-3">
                      {WEEKDAY_LABELS.map((label, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleAllowedDay(i)}
                          className={cn(
                            "flex cursor-pointer items-center justify-center rounded-xl border-[1px] h-[42px] w-[42px] px-3 py-2 text-sm font-semibold transition-all select-none",
                            receptionSettings.allowedDays[i]
                              ? "border-primary-300 bg-primary-50 text-primary-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          )}
                          aria-pressed={receptionSettings.allowedDays[i]}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {touched.allowedDays && <FieldError message={getAllowedDaysError()} />}
                    <button
                      type="button"
                      className={cn("toggle-btn w-[250px] mt-4", receptionSettings.acceptHolidays && "toggle-btn-active")}
                      onClick={() => setReceptionSettings({ ...receptionSettings, acceptHolidays: !receptionSettings.acceptHolidays })}
                    >
                      <span>祝日は受け付ける</span>
                      <span className={cn("toggle-btn-switch", receptionSettings.acceptHolidays && "toggle-btn-switch-active")}>
                        <span className={cn("toggle-btn-switch-handle", receptionSettings.acceptHolidays && "toggle-btn-switch-handle-active")} />
                      </span>
                    </button>
                  </div>
                </div>
                {/* 受付期間設定 */}
                <div>
                  <label className="label">受付期間</label>
                  <div className="mt-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="number"
                            className="input"
                            min={0}
                            value={bookingWindowStart.value}
                            onChange={(e) => {
                              setBookingWindowStart({ ...bookingWindowStart, value: parseInt(e.target.value) || 0 });
                              touch("bookingWindow");
                            }}
                          />
                          <select
                            className="select"
                            value={bookingWindowStart.unit}
                            onChange={(e) => {
                              setBookingWindowStart({ ...bookingWindowStart, unit: e.target.value as "days" | "weeks" | "months" });
                              touch("bookingWindow");
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
                            className="input"
                            min={1}
                            value={bookingWindowEnd.value}
                            onChange={(e) => {
                              setBookingWindowEnd({ ...bookingWindowEnd, value: parseInt(e.target.value) || 1 });
                              touch("bookingWindow");
                            }}
                          />
                          <select
                            className="select"
                            value={bookingWindowEnd.unit}
                            onChange={(e) => {
                              setBookingWindowEnd({ ...bookingWindowEnd, unit: e.target.value as "days" | "weeks" | "months" });
                              touch("bookingWindow");
                            }}
                          >
                            <option value="days">日後</option>
                            <option value="weeks">週間後</option>
                            <option value="months">ヶ月後</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    {touched.bookingWindow && <FieldError message={getBookingWindowError()} />}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="step-section-title">メンバー設定</h2>
              <p className="mt-1 text-sm text-gray-500">
                面接に参加するメンバーの役割と配分を設定します
              </p>
              <div className="mt-6 space-y-5">
                {/* Scheduling mode */}
                <div>
                  <label className="label">スケジューリングモード</label>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <button
                      onClick={() =>
                        setFormData({ ...formData, scheduling_mode: "weekday" })
                      }
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                        formData.scheduling_mode === "weekday"
                          ? "border-primary-600 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <CalendarDays className="h-5 w-5 text-gray-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold">
                          曜日モード
                        </h4>
                        <p className="mt-1 text-xs text-gray-500">
                          曜日ごとにメンバーを設定
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setFormData({ ...formData, scheduling_mode: "fixed" })
                      }
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                        formData.scheduling_mode === "fixed"
                          ? "border-primary-600 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <Lock className="h-5 w-5 text-gray-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold">
                          固定モード
                        </h4>
                        <p className="mt-1 text-xs text-gray-500">
                          優先順でメンバーを設定
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setFormData({ ...formData, scheduling_mode: "pool" })
                      }
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                        formData.scheduling_mode === "pool"
                          ? "border-primary-600 bg-primary-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <Users className="h-5 w-5 text-gray-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold">
                          プールモード
                        </h4>
                        <p className="mt-1 text-xs text-gray-500">
                          役割ごとにメンバーを設定
                        </p>
                      </div>
                    </button>
                  </div>
                  <div className="mt-3 rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-600">
                      {formData.scheduling_mode === "weekday"
                        ? "曜日モードでは、受付設定で有効な曜日ごとに担当メンバーを設定します。各曜日に優先度順でメンバーを割り当てられます。"
                        : formData.scheduling_mode === "fixed"
                          ? "固定モードでは、全メンバーの空き時間が一致する枠のみが候補者に表示されます。少人数の面接に適しています。"
                          : "プールモードでは、役割ごとに必要人数を設定し、条件を満たす枠が自動で選出されます。大人数の面接パネルに適しています。"}
                    </p>
                  </div>
                </div>

                {/* Member mode sections */}
                {membersLoading ? (
                  <PageLoader />
                ) : (
                  <>
                    {/* Weekday mode */}
                    {formData.scheduling_mode === "weekday" && (
                      <div>
                        <label className="label">曜日別メンバー</label>
                        {enabledDays.length === 0 ? (
                          <p className="mt-2 text-sm text-gray-400">受付設定で曜日を有効にしてください</p>
                        ) : (
                          <div className="mt-2 space-y-3">
                            {enabledDays.map(({ label, dayIndex }) => {
                              const entry = weekdaySchedule.find((e) => e.dayIndex === dayIndex) ?? { dayIndex, memberIds: [] as string[], requiredCount: 1 };
                              const usedIds = entry.memberIds;
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
                                        value={entry.requiredCount ?? 1}
                                        onChange={(e) => updateWeekdayRequiredCount(dayIndex, parseInt(e.target.value) || 1)}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                      <span>人</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <DndContext
                                      sensors={sensors}
                                      collisionDetection={closestCenter}
                                      onDragEnd={(e) => handleWeekdayMemberDragEnd(e, dayIndex)}
                                    >
                                      <SortableContext
                                        items={usedIds.map((uid) => `${dayIndex}-${uid}`)}
                                        strategy={verticalListSortingStrategy}
                                      >
                                        {usedIds.map((userId, memberIndex) => {
                                          const user = teamMembers.find((u) => u.id === userId);
                                          return (
                                            <SortableRow key={`${dayIndex}-${userId}`} id={`${dayIndex}-${userId}`}>
                                              {(handle) => (
                                                <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                                                  {handle}
                                                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-100 px-1 text-xs font-semibold text-primary-700 shrink-0">
                                                    {memberIndex + 1}
                                                  </span>
                                                  <span className="flex-1 text-sm text-gray-700">
                                                    {user?.full_name || userId}
                                                  </span>
                                                  <button
                                                    onClick={() => removeWeekdayMember(dayIndex, userId)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
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
                                    <div className="relative">
                                      <button
                                        onClick={() => setWeekdayMemberDropdownOpen(weekdayMemberDropdownOpen === dayIndex ? null : dayIndex)}
                                        className="flex items-center gap-1 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                                      >
                                        <Plus className="h-3 w-3" />
                                        メンバー追加
                                        <ChevronDown className="h-3 w-3" />
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
                                            <p className="px-3 py-2 text-sm text-gray-400">追加できるメンバーがいません</p>
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
                    {formData.scheduling_mode === "fixed" && (
                      <div>
                        <label className="label">メンバー</label>
                        <div className="mt-2 rounded-2xl border border-gray-200 p-4">
                          <div className="space-y-2">
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
                                        <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                                          {handle}
                                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-100 px-1 text-xs font-semibold text-primary-700 shrink-0">
                                            {index + 1}
                                          </span>
                                          <span className="flex-1 text-sm text-gray-700">
                                            {user?.full_name || userId}
                                          </span>
                                          <button
                                            onClick={() => removeFixedMember(userId)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
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

                            {/* Add member dropdown */}
                            <div className="relative">
                              <button
                                onClick={() => setFixedMemberDropdownOpen(!fixedMemberDropdownOpen)}
                                className="flex items-center gap-1 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                                メンバー追加
                                <ChevronDown className="h-3 w-3" />
                              </button>

                              {fixedMemberDropdownOpen && (
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
                                    <p className="px-3 py-2 text-sm text-gray-400">
                                      追加できるメンバーがいません
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {touched.fixedMembers && <FieldError message={getFixedMembersError()} />}
                        </div>
                      </div>
                    )}

                    {/* Pool mode */}
                    {formData.scheduling_mode === "pool" && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="label">役割とメンバー</label>
                        </div>
                        <div className="space-y-3">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleRoleDragEnd}
                          >
                            <SortableContext
                              items={roles.map((r) => r.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {roles.map((role, roleIndex) => (
                                <SortableRow key={role.id} id={role.id}>
                                  {(handle) => (
                                    <div className="rounded-2xl border border-gray-200 p-4">
                                      {/* Role header */}
                                      <div className="flex items-center gap-6">
                                        <div className="flex-1 flex items-center gap-3">
                                          {handle}
                                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1 text-xs font-semibold text-gray-600 shrink-0">
                                            {roleIndex + 1}
                                          </span>
                                          <div className="flex-1">
                                            <input
                                              type="text"
                                              className={cn("input w-full", touched[`role_${role.id}_name`] && getRoleNameError(role.id) && "input-error")}
                                              value={role.name}
                                              onChange={(e) => updateRole(role.id, { name: e.target.value })}
                                              onBlur={() => touch(`role_${role.id}_name`)}
                                              placeholder="役割名（例: 面接官）"
                                            />
                                            {touched[`role_${role.id}_name`] && <FieldError message={getRoleNameError(role.id)} />}
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <label className="text-xs text-gray-500 whitespace-nowrap">必要人数</label>
                                            <input
                                              type="number"
                                              className="input w-16 text-center"
                                              value={role.required_count}
                                              onChange={(e) =>
                                                updateRole(role.id, {
                                                  required_count: parseInt(e.target.value) || 1,
                                                })
                                              }
                                              min={1}
                                            />
                                          </div>
                                        </div>
                                        {roles.length > 1 && (
                                          <button
                                            onClick={() => removeRole(role.id)}
                                            className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        )}
                                      </div>

                                      {/* Members */}
                                      <div className="mt-3 space-y-2">
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
                                                    <div className="flex items-center gap-2 rounded-xl border border-gray-100 px-3 py-2">
                                                      {memberHandle}
                                                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-50 px-0.5 text-xs font-semibold text-primary-600 shrink-0">
                                                        {memberIndex + 1}
                                                      </span>
                                                      <span className="flex-1 text-sm text-gray-700">
                                                        {user?.full_name || userId}
                                                      </span>
                                                      <button
                                                        onClick={() =>
                                                          removeMemberFromRole(role.id, userId)
                                                        }
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
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

                                        {/* Add member dropdown */}
                                        <div className="relative">
                                          <button
                                            onClick={() =>
                                              setMemberDropdownOpen(
                                                memberDropdownOpen === role.id
                                                  ? null
                                                  : role.id
                                              )
                                            }
                                            className="flex items-center gap-1 rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                                          >
                                            <Plus className="h-3 w-3" />
                                            メンバー追加
                                            <ChevronDown className="h-3 w-3" />
                                          </button>

                                          {memberDropdownOpen === role.id && (
                                            <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                                              {teamMembers
                                                .filter(
                                                  (u) => !role.memberIds.includes(u.id)
                                                )
                                                .map((user) => (
                                                  <button
                                                    key={user.id}
                                                    onClick={() =>
                                                      addMemberToRole(role.id, user.id)
                                                    }
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
                                              {teamMembers.filter(
                                                (u) => !role.memberIds.includes(u.id)
                                              ).length === 0 && (
                                                  <p className="px-3 py-2 text-sm text-gray-400">
                                                    追加できるメンバーがいません
                                                  </p>
                                                )}
                                            </div>
                                          )}
                                        </div>
                                        {touched[`role_${role.id}_members`] && <FieldError message={getRoleMembersError(role.id)} />}
                                      </div>
                                    </div>
                                  )}
                                </SortableRow>
                              ))}
                            </SortableContext>
                          </DndContext>

                          <button
                            onClick={addRole}
                            className="add-btn"
                          >
                            <Plus className="h-4 w-4" />
                            役割を追加
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Options (Exclusions + Form + Reminder) */}
        {step === "options" && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="step-section-title">除外ルール</h2>
              <p className="mt-1 text-sm text-gray-500">
                特定の日時をスケジュール対象外に設定します（任意）
              </p>
              <div className="mt-6 space-y-4">
                {/* Existing rules list */}
                {newExclusionRules.length > 0 && (
                  <div className="space-y-2">
                    {newExclusionRules.map((rule) => (
                      <div key={rule.id}>
                        {editingExclusionId === rule.id ? (
                          /* Edit form for this rule */
                          <div className="bg-hilight rounded-2xl border border-primary-200 p-4 space-y-3">
                            <p className="text-sm font-semibold">除外ルールを編集</p>
                            <div>
                              <label className="label">ルール名</label>
                              <input
                                type="text"
                                className="input mt-1"
                                value={editExclusionDraft.name}
                                onChange={(e) => setEditExclusionDraft({ ...editExclusionDraft, name: e.target.value })}
                                placeholder="例: 昼休み、全社定例会議"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="label">タイプ</label>
                                <select
                                  className="select mt-1"
                                  value={editExclusionDraft.type}
                                  onChange={(e) => setEditExclusionDraft({ ...editExclusionDraft, type: e.target.value as "all-day" | "time-range" })}
                                >
                                  <option value="all-day">終日</option>
                                  <option value="time-range">時間帯</option>
                                </select>
                              </div>
                              <div>
                                <label className="label">繰り返し</label>
                                <button
                                  onClick={() => setEditExclusionDraft({ ...editExclusionDraft, recurring: !editExclusionDraft.recurring })}
                                  className={cn("toggle-btn", editExclusionDraft.recurring ? "toggle-btn-active" : "")}
                                >
                                  <span>{editExclusionDraft.recurring ? "繰り返し" : "1回限り"}</span>
                                  <div className={cn("toggle-btn-switch", editExclusionDraft.recurring ? "toggle-btn-switch-active" : "")}>
                                    <span className={cn("toggle-btn-switch-handle", editExclusionDraft.recurring ? "toggle-btn-switch-handle-active" : "")} />
                                  </div>
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {editExclusionDraft.recurring ? (
                                <div>
                                  <label className="label">曜日</label>
                                  <select
                                    className="select mt-1"
                                    value={editExclusionDraft.day_of_week ?? ""}
                                    onChange={(e) => setEditExclusionDraft({ ...editExclusionDraft, day_of_week: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                                  >
                                    <option value="">毎日</option>
                                    {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                                      <option key={i} value={i}>{d}曜日</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <div>
                                  <label className="label">対象日</label>
                                  <input
                                    type="date"
                                    className="input mt-1"
                                    value={editExclusionDraft.specific_date ?? ""}
                                    onChange={(e) => setEditExclusionDraft({ ...editExclusionDraft, specific_date: e.target.value })}
                                  />
                                </div>
                              )}
                              {editExclusionDraft.type === "time-range" && (
                                <>
                                  <div>
                                    <label className="label">開始時刻</label>
                                    <input type="time" className="input mt-1" value={editExclusionDraft.start_time ?? "09:00"} onChange={(e) => setEditExclusionDraft({ ...editExclusionDraft, start_time: e.target.value })} />
                                  </div>
                                  <div>
                                    <label className="label">終了時刻</label>
                                    <input type="time" className="input mt-1" value={editExclusionDraft.end_time ?? "10:00"} onChange={(e) => setEditExclusionDraft({ ...editExclusionDraft, end_time: e.target.value })} />
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button onClick={() => setEditingExclusionId(null)} className="btn btn-ghost">キャンセル</button>
                              <button onClick={() => saveEditExclusionRule(rule.id)} disabled={!editExclusionDraft.name.trim() || (!editExclusionDraft.recurring && !editExclusionDraft.specific_date)} className="btn btn-primary">保存</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                            <div>
                              <p className="text-sm font-medium">{rule.name}</p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {rule.type === "all-day" ? "終日" : `${rule.start_time} - ${rule.end_time}`}
                                {rule.recurring && rule.day_of_week !== undefined
                                  ? ` · 毎週${["日", "月", "火", "水", "木", "金", "土"][rule.day_of_week]}曜日`
                                  : rule.recurring
                                    ? " · 毎日"
                                    : rule.specific_date
                                      ? ` · ${rule.specific_date}`
                                      : ""}
                                <span className={cn(
                                  "ml-2 rounded-full px-2 py-0.5 text-xs font-medium",
                                  rule.recurring ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
                                )}>
                                  {rule.recurring ? "繰り返し" : "1回限り"}
                                </span>
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => startEditExclusionRule(rule)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="編集"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeExclusionRule(rule.id)}
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
                )}

                {/* Add form */}
                {showExclusionForm ? (
                  <div className="bg-hilight rounded-2xl border border-primary-200 p-4 space-y-3">
                    <p className="text-sm font-semibold">新しい除外ルール</p>
                    <div>
                      <label className="label">ルール名</label>
                      <input
                        type="text"
                        className={cn("input mt-1", touched.exclusionName && getExclusionNameError(exclusionDraft.name) && "input-error")}
                        value={exclusionDraft.name}
                        onChange={(e) => { setExclusionDraft({ ...exclusionDraft, name: e.target.value }); touch("exclusionName"); }}
                        onBlur={() => touch("exclusionName")}
                        placeholder="例: 昼休み、全社定例会議"
                      />
                      {touched.exclusionName && <FieldError message={getExclusionNameError(exclusionDraft.name)} />}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label">タイプ</label>
                        <select
                          className="select mt-1"
                          value={exclusionDraft.type}
                          onChange={(e) =>
                            setExclusionDraft({
                              ...exclusionDraft,
                              type: e.target.value as "all-day" | "time-range",
                            })
                          }
                        >
                          <option value="all-day">終日</option>
                          <option value="time-range">時間帯</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">繰り返し</label>
                        <button
                          onClick={() =>
                            setExclusionDraft({ ...exclusionDraft, recurring: !exclusionDraft.recurring })
                          }
                          className={cn(
                            "toggle-btn",
                            exclusionDraft.recurring
                              ? "toggle-btn-active"
                              : ""
                          )}
                        >
                          <span>繰り返す</span>
                          <div className={cn(
                            "toggle-btn-switch",
                            exclusionDraft.recurring ? "toggle-btn-switch-active" : ""
                          )}>
                            <span className={cn(
                              "toggle-btn-switch-handle",
                              exclusionDraft.recurring ? "toggle-btn-switch-handle-active" : ""
                            )} />
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {exclusionDraft.recurring ? (
                        <div>
                          <label className="label">曜日</label>
                          <select
                            className="select mt-1"
                            value={exclusionDraft.day_of_week ?? ""}
                            onChange={(e) =>
                              setExclusionDraft({
                                ...exclusionDraft,
                                day_of_week: e.target.value === "" ? undefined : parseInt(e.target.value),
                              })
                            }
                          >
                            <option value="">毎日</option>
                            {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                              <option key={i} value={i}>{d}曜日</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="label">対象日</label>
                          <input
                            type="date"
                            className={cn("input mt-1", touched.exclusionDate && getExclusionDateError(exclusionDraft) && "input-error")}
                            value={exclusionDraft.specific_date ?? ""}
                            onChange={(e) => { setExclusionDraft({ ...exclusionDraft, specific_date: e.target.value }); touch("exclusionDate"); }}
                          />
                          {touched.exclusionDate && <FieldError message={getExclusionDateError(exclusionDraft)} />}
                        </div>
                      )}
                      {exclusionDraft.type === "time-range" && (
                        <>
                          <div>
                            <label className="label">開始時刻</label>
                            <input
                              type="time"
                              className="input mt-1"
                              value={exclusionDraft.start_time ?? "09:00"}
                              onChange={(e) =>
                                setExclusionDraft({ ...exclusionDraft, start_time: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <label className="label">終了時刻</label>
                            <input
                              type="time"
                              className="input mt-1"
                              value={exclusionDraft.end_time ?? "10:00"}
                              onChange={(e) =>
                                setExclusionDraft({ ...exclusionDraft, end_time: e.target.value })
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => { setShowExclusionForm(false); setTouched((prev) => { const n = { ...prev }; delete n.exclusionName; delete n.exclusionDate; return n; }); }}
                        className="btn btn-ghost"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={addExclusionRule}
                        className="btn btn-primary"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowExclusionForm(true)}
                    className="add-btn"
                  >
                    <Plus className="h-4 w-4" />
                    除外ルールを追加
                  </button>
                )}

                {newExclusionRules.length === 0 && !showExclusionForm && (
                  <p className="text-center text-xs text-gray-400">
                    除外ルールはオプションです。後から設定することもできます。
                  </p>
                )}
              </div>
            </div>
            <div className="card">
              <h2 className="step-section-title">フォーム設定</h2>
              <p className="mt-1 text-sm text-gray-500">
                候補者に入力してもらう追加項目を設定します（任意）
              </p>
              <div className="mt-6 space-y-4">
                {/* Default fields */}
                <div className="space-y-2">
                  <p className="label">デフォルト項目（変更不可）</p>
                  {[
                    { label: "お名前", type: "テキスト" },
                    { label: "メールアドレス", type: "メール" },
                    { label: "電話番号", type: "電話番号" },
                  ].map((f) => (
                    <div key={f.label} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                      <span className="text-sm font-medium text-gray-500">{f.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">{f.type}</span>
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">必須</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom fields */}
                <div className="space-y-2">
                  <p className="label">カスタム項目</p>
                  {formFields.length > 0 && (
                    formFields.map((field) => (
                      <div key={field.id}>
                        {editingFieldId === field.id ? (
                          <div className="bg-hilight rounded-2xl border border-primary-200 p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="label">ラベル名</label>
                                <input type="text" className="input mt-1" value={editFieldDraft.label} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, label: e.target.value })} placeholder="例: 希望年収" />
                              </div>
                              <div>
                                <label className="label">タイプ</label>
                                <select className="select mt-1" value={editFieldDraft.type} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, type: e.target.value as FieldType })}>
                                  <option value="text">テキスト</option>
                                  <option value="email">メール</option>
                                  <option value="tel">電話番号</option>
                                  <option value="multiline">複数行テキスト</option>
                                  <option value="url">URL</option>
                                  <option value="file">ファイル</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="label">プレースホルダー</label>
                              <input type="text" className="input mt-1" value={editFieldDraft.placeholder} onChange={(e) => setEditFieldDraft({ ...editFieldDraft, placeholder: e.target.value })} placeholder="入力例を記入（任意）" />
                            </div>
                            <div>
                              <button
                                onClick={() => setEditFieldDraft({ ...editFieldDraft, is_required: !editFieldDraft.is_required })}
                                className={cn("toggle-btn", editFieldDraft.is_required ? "toggle-btn-active" : "")}
                              >
                                <span>必須項目にする</span>
                                <div className={cn("toggle-btn-switch", editFieldDraft.is_required ? "toggle-btn-switch-active" : "")}>
                                  <span className={cn("toggle-btn-switch-handle", editFieldDraft.is_required ? "toggle-btn-switch-handle-active" : "")} />
                                </div>
                              </button>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button onClick={() => setEditingFieldId(null)} className="btn btn-ghost">キャンセル</button>
                              <button onClick={() => saveEditFormField(field.id)} disabled={!editFieldDraft.label.trim()} className="btn btn-primary">保存</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                            <span className="text-sm font-medium text-gray-700">{field.label}</span>
                            <div className="flex items-center gap-4">
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                {{ text: "テキスト", email: "メール", tel: "電話番号", multiline: "複数行テキスト", url: "URL", file: "ファイル" }[field.type]}
                              </span>
                              <span className={cn("rounded-full px-2 py-0.5 text-xs", field.is_required ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500")}>
                                {field.is_required ? "必須" : "任意"}
                              </span>
                              <button onClick={() => startEditFormField(field)} className="text-gray-400 hover:text-gray-600 transition-colors" title="編集">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => removeFormField(field.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="削除">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add field form */}
                {showFieldForm ? (
                  <div className="bg-hilight rounded-2xl border border-primary-200 p-4 space-y-3">
                    <p className="text-sm font-semibold">新しい項目</p>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="label">ラベル名</label>
                        <input
                          type="text"
                          className={cn("input mt-1", touched.fieldLabel && getFieldLabelError(fieldDraft.label) && "input-error")}
                          value={fieldDraft.label}
                          onChange={(e) => { setFieldDraft({ ...fieldDraft, label: e.target.value }); touch("fieldLabel"); }}
                          onBlur={() => touch("fieldLabel")}
                          placeholder="例: 希望年収"
                        />
                        {touched.fieldLabel && <FieldError message={getFieldLabelError(fieldDraft.label)} />}
                      </div>
                      <div className="w-[220px]">
                        <label className="label">必須項目</label>
                        <button
                          onClick={() => setFieldDraft({ ...fieldDraft, is_required: !fieldDraft.is_required })}
                          className={cn("toggle-btn", fieldDraft.is_required ? "toggle-btn-active" : "")}
                        >
                          <span>必須項目にする</span>
                          <div className={cn("toggle-btn-switch", fieldDraft.is_required ? "toggle-btn-switch-active" : "")}>
                            <span className={cn("toggle-btn-switch-handle", fieldDraft.is_required ? "toggle-btn-switch-handle-active" : "")} />
                          </div>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">タイプ</label>
                      <select className="select mt-1" value={fieldDraft.type} onChange={(e) => setFieldDraft({ ...fieldDraft, type: e.target.value as FieldType })}>
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
                      <input type="text" className="input mt-1" value={fieldDraft.placeholder} onChange={(e) => setFieldDraft({ ...fieldDraft, placeholder: e.target.value })} placeholder="入力例を記入（任意）" />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => { setShowFieldForm(false); setFieldDraft({ ...EMPTY_FIELD_DRAFT }); setTouched((prev) => { const n = { ...prev }; delete n.fieldLabel; return n; }); }} className="btn btn-ghost">キャンセル</button>
                      <button onClick={addFormField} className="btn btn-primary">追加</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowFieldForm(true)} className="add-btn">
                    <Plus className="h-4 w-4" />
                    項目を追加
                  </button>
                )}

                {formFields.length === 0 && !showFieldForm && (
                  <p className="text-center text-xs text-gray-400">
                    カスタム項目はオプションです。後から設定することもできます。
                  </p>
                )}
              </div>
            </div>
            <div className="card">
              <h2 className="step-section-title">リマインド設定</h2>
              <p className="mt-1 text-sm text-gray-500">
                候補者へのリマインドを設定します（任意）
              </p>
              <div className="mt-6 space-y-3">
                {reminders.length > 0 && (
                  <div className="space-y-3">
                    {reminders.map((reminder) => (
                      <div key={reminder.id}>
                        {editingReminderId === reminder.id ? (
                          <div className="bg-hilight rounded-2xl border border-primary-200 p-4 space-y-3">
                            <p className="text-sm font-semibold">リマインドを編集</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="label">タイミング（数値）</label>
                                <input
                                  type="number"
                                  className="input mt-1"
                                  min={1}
                                  value={editReminderDraft.timing_value}
                                  onChange={(e) => setEditReminderDraft({ ...editReminderDraft, timing_value: parseInt(e.target.value) || 1 })}
                                />
                              </div>
                              <div>
                                <label className="label">単位</label>
                                <select
                                  className="select mt-1"
                                  value={editReminderDraft.timing_unit}
                                  onChange={(e) => setEditReminderDraft({ ...editReminderDraft, timing_unit: e.target.value as ReminderUnit })}
                                >
                                  <option value="hours">時間前</option>
                                  <option value="days">日前</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="label">メッセージ内容</label>
                              <div className="mt-1 rounded-2xl border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 text-sm text-gray-500 border-b border-gray-200">
                                  <p>田中 太郎 様</p>
                                  <p className="mt-1">面接の <span className="font-medium text-gray-700">{editReminderDraft.timing_value}{editReminderDraft.timing_unit === "hours" ? "時間前" : "日前"}</span> になりましたので、再度ご連絡いたします。</p>
                                </div>
                                <textarea
                                  className="w-full px-4 py-3 text-sm resize-y focus:outline-none min-h-[80px]"
                                  placeholder="候補者に送るメッセージを入力してください"
                                  value={editReminderDraft.message}
                                  onChange={(e) => setEditReminderDraft({ ...editReminderDraft, message: e.target.value })}
                                />
                                <div className="bg-gray-50 px-4 py-3 text-sm text-gray-500 border-t border-gray-200 space-y-1">
                                  <p className="font-medium text-gray-700">面接情報</p>
                                  <p>日時　2026年4月1日水曜日 11:00 〜 12:00</p>
                                  <p>主催　株式会社KOHEI</p>
                                  {formData.location_type === "online" ? (
                                    formData.onlineMeetType === "meet" ? (
                                      <p>参加リンク　<span className="text-gray-400">（Google Meet 自動生成）</span></p>
                                    ) : formData.location_detail ? (
                                      <p>参加リンク　<span className="text-blue-500 underline">{formData.location_detail}</span></p>
                                    ) : (
                                      <p>参加リンク　<span className="text-gray-400">（URLを入力してください）</span></p>
                                    )
                                  ) : formData.location_type === "in-person" ? (
                                    <p>場所　{formData.location_detail || <span className="text-gray-400">（会議室名や住所）</span>}</p>
                                  ) : formData.location_type === "phone" ? (
                                    <p>電話　{formData.location_detail || <span className="text-gray-400">（電話番号）</span>}</p>
                                  ) : (
                                    <p className="text-gray-400">（場所未設定）</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <button onClick={() => setEditingReminderId(null)} className="btn btn-ghost">
                                キャンセル
                              </button>
                              <button onClick={() => saveEditReminder(reminder.id)} className="btn btn-primary">
                                保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                            <div>
                              <p className="text-sm font-medium">
                                メール
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {reminder.timing_value}{reminder.timing_unit === "hours" ? "時間前" : "日前"}
                                {reminder.message && (
                                  <span> · {reminder.message.length > 30 ? `${reminder.message.slice(0, 30)}…` : reminder.message}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => startEditReminder(reminder)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="編集"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setReminders(reminders.filter((r) => r.id !== reminder.id))}
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
                )}

                {showReminderForm ? (
                  <div className="bg-hilight rounded-2xl border border-primary-200 p-4 space-y-3 shadow-sm">
                    <p className="text-sm font-semibold">新しいリマインド</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">タイミング（数値）</label>
                        <input
                          type="number"
                          className="input mt-1"
                          min={1}
                          value={reminderDraft.timing_value}
                          onChange={(e) => setReminderDraft({ ...reminderDraft, timing_value: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <label className="label">単位</label>
                        <select
                          className="select mt-1"
                          value={reminderDraft.timing_unit}
                          onChange={(e) => setReminderDraft({ ...reminderDraft, timing_unit: e.target.value as ReminderUnit })}
                        >
                          <option value="hours">時間前</option>
                          <option value="days">日前</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label">メッセージ内容</label>
                      <div className="mt-1 rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 text-xs text-gray-500 border-b border-gray-100">
                          <p>田中 太郎 様</p>
                          <p className="mt-1">面接の <span className="font-medium text-gray-700">{reminderDraft.timing_value}{reminderDraft.timing_unit === "hours" ? "時間前" : "日前"}</span> になりましたので、再度ご連絡いたします。</p>
                        </div>
                        <textarea
                          className="w-full px-4 py-3 text-sm resize-y focus:outline-none min-h-[80px]"
                          placeholder="候補者に送るメッセージを入力してください（任意）"
                          value={reminderDraft.message}
                          onChange={(e) => setReminderDraft({ ...reminderDraft, message: e.target.value })}
                        />
                        <div className="bg-gray-50 px-4 py-3 text-xs text-gray-500 border-t border-gray-100 space-y-1">
                          <p className="font-medium text-gray-700">面接情報</p>
                          <p>日時　2026年4月1日水曜日 11:00 〜 12:00</p>
                          <p>主催　株式会社KOHEI</p>
                          {formData.location_type === "online" ? (
                            formData.onlineMeetType === "meet" ? (
                              <p>参加リンク　<span className="text-blue-500">https://meet.google.com/XXX-XXX-XXX</span></p>
                            ) : formData.location_detail ? (
                              <p>参加リンク　<span className="text-blue-500 underline">{formData.location_detail}</span></p>
                            ) : (
                              <p>参加リンク　<span className="text-gray-400">（URL未設定）</span></p>
                            )
                          ) : formData.location_type === "in-person" ? (
                            <p>場所　{formData.location_detail || <span className="text-gray-400">（会議室名や住所）</span>}</p>
                          ) : formData.location_type === "phone" ? (
                            <p>電話　{formData.location_detail || <span className="text-gray-400">（電話番号）</span>}</p>
                          ) : (
                            <p className="text-gray-400">（場所未設定）</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => { setShowReminderForm(false); setReminderDraft({ ...EMPTY_REMINDER_DRAFT }); setTouched((prev) => { const n = { ...prev }; delete n.reminderMessage; return n; }); }}
                        className="btn btn-ghost"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleAddReminder}
                        className="btn btn-primary"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowReminderForm(true)}
                    className="add-btn"
                  >
                    <Plus className="h-4 w-4" />
                    リマインドを追加
                  </button>
                )}

                {reminders.length === 0 && (
                  <p className="text-center text-xs text-gray-400">
                    リマインドはオプションです。後から設定することもできます。
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === "confirm" && (
          <div className="card">
            <h2 className="step-section-title">設定内容の確認</h2>
            <p className="mt-1 text-sm text-gray-500">
              以下の内容でイベントを作成します
            </p>
            <div className="mt-6 space-y-4">

              {/* ボディーヘッダー */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex flex-col">
                    <div className="flex gap-2 items-center">
                      {/* カラー */}
                      <div
                        className="h-2 w-2 min-w-2 rounded-full"
                        style={{ backgroundColor: formData.color || "#0071c1" }}
                      />
                      {/* タイトル行 */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm leading-relaxed">
                          {formData.title}
                        </span>
                        {formData.isPublic ? (
                          <span className="badge badge-green">公開</span>
                        ) : (
                          <span className="badge badge-gray">非公開（下書き）</span>
                        )}
                      </div>
                    </div>

                    {/* 説明 */}
                    {formData.description && (
                      <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                        {formData.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 時間・場所 */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="space-y-2">
                  <dl className="flex items-center gap-2.5 text-sm">
                    <dt><Clock className="h-4 w-4 shrink-0 text-gray-400" /></dt>
                    <dd>
                      {formData.duration}分
                      {(formData.buffer_before > 0 || formData.buffer_after > 0) && (
                        <span className="text-xs text-gray-400 pl-2">
                          （前 {formData.buffer_before}分 / 後 {formData.buffer_after}分）
                        </span>
                      )}
                    </dd>
                  </dl>
                  <dl className="flex items-center gap-2.5 text-sm">
                    <dt>
                      {formData.location_type === "online" ? (
                        <Video className="h-45 w-4 text-gray-400" />
                      ) : formData.location_type === "phone" ? (
                        <Phone className="h-4 w-4 text-gray-400" />
                      ) : (
                        <MapPin className="h-4 w-4 text-gray-400" />
                      )}
                    </dt>
                    <dd>
                      {formData.location_type === "online"
                        ? formData.onlineMeetType === "meet"
                          ? <>オンライン<span className="text-xs text-gray-400 pl-2">Google Meet 自動生成</span></>
                          : <>オンライン{formData.location_detail && <span className="text-xs text-gray-400 pl-2">{formData.location_detail}</span>}</>
                        : formData.location_type === "in-person"
                          ? "対面"
                          : "電話"}
                      {formData.location_type !== "online" && formData.location_detail && (
                        <span className="text-xs text-gray-400 pl-2">
                          {formData.location_detail}
                        </span>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>

              {/* 受付設定 */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <h3 className="section-label">受付設定</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-4">
                    <dt className="min-w-[30px] leading-[1.3rem] text-sm text-gray-400">時間</dt>
                    <dd>{receptionSettings.excludeOutsideHours ? "営業時間外は受け付けない" : "時間制限なし"}</dd>
                  </div>
                  <div className="flex items-start gap-4">
                    <dt className="min-w-[30px] leading-[1.3rem] text-sm text-gray-400">曜日</dt>
                    <dd>
                      {WEEKDAY_LABELS.filter((_, i) => receptionSettings.allowedDays[i]).join("・")}
                      {receptionSettings.allowedDays.every((d) => !d) && <span className="text-gray-300">なし</span>}
                      <span className="ml-2">（{receptionSettings.acceptHolidays ? "祝日は受け付ける" : "祝日は受け付けない"}）</span>
                    </dd>
                  </div>
                  <div className="flex items-start gap-4">
                    <dt className="min-w-[30px] leading-[1.3rem] text-sm text-gray-400">期間</dt>
                    <dd>{bookingWindowStart.value}{bookingWindowStart.unit === "days" ? "日後" : bookingWindowStart.unit === "weeks" ? "週間後" : "ヶ月後"}から{bookingWindowEnd.value}{bookingWindowEnd.unit === "days" ? "日後" : bookingWindowEnd.unit === "weeks" ? "週間後" : "ヶ月後"}まで</dd>
                  </div>
                </div>
              </div>

              {/* メンバー */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <h3 className="section-label">
                  メンバー
                  <span className="section-sub-label">（{formData.scheduling_mode === "weekday" ? "曜日モード" : formData.scheduling_mode === "fixed" ? "固定モード" : "プールモード"}）</span>
                </h3>
                {formData.scheduling_mode === "weekday" ? (
                  weekdaySchedule.filter((e) => e.memberIds.length > 0).length > 0 ? (
                    <div className="space-y-3">
                      {weekdaySchedule
                        .filter((e) => e.memberIds.length > 0)
                        .map((entry) => {
                          const label = WEEKDAY_LABELS[entry.dayIndex];
                          return (
                            <div key={entry.dayIndex}>
                              <p className="text-xs font-semibold text-gray-600 mb-1">
                                {label}曜日
                                <span className="ml-1 font-normal text-gray-400">（{entry.requiredCount ?? 1}人必要）</span>
                              </p>
                              <ul className="inline-flex flex-wrap gap-x-4 gap-y-2">
                                {entry.memberIds.map((userId) => {
                                  const user = teamMembers.find((u) => u.id === userId);
                                  return (
                                    <li key={userId} className="flex flex-wrap items-center gap-2">
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                                        {user?.full_name.charAt(0) ?? "?"}
                                      </div>
                                      <span className="text-sm whitespace-nowrap">{user?.full_name ?? "Unknown"}</span>
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
                ) : formData.scheduling_mode === "fixed" ? (
                  fixedMemberIds.length > 0 ? (
                    <ul className="inline-flex flex-wrap gap-x-4 gap-y-2">
                      {fixedMemberIds.slice(0, 4).map((userId) => {
                        const user = teamMembers.find((u) => u.id === userId);
                        return (
                          <li
                            key={userId}
                            className="flex flex-wrap items-center gap-2"
                            title={user?.full_name}
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                              {user?.full_name.charAt(0) ?? "?"}
                            </div>
                            <span className="text-sm whitespace-nowrap">
                              {user?.full_name ?? "Unknown"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-300">メンバー未設定</p>
                  )
                ) : roles.length > 0 ? (
                  <div className="space-y-4">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                      >
                        <div className="text-xs font-semibold text-gray-600 mb-2">
                          {role.name || "未入力"}
                          <span className="ml-1 font-normal text-gray-400">
                            （{role.required_count}人）
                          </span>
                        </div>
                        <ul className="inline-flex flex-wrap gap-x-4 gap-y-2">
                          {role.memberIds.slice(0, 4).map((userId) => {
                            const user = teamMembers.find((u) => u.id === userId);
                            return (
                              <li
                                key={userId}
                                className="flex flex-wrap items-center gap-2"
                                title={user?.full_name}
                              >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                                  {user?.full_name.charAt(0) ?? "?"}
                                </div>
                                <span className="text-sm whitespace-nowrap">
                                  {user?.full_name ?? "Unknown"}
                                </span>
                              </li>
                            );
                          })}
                          {role.memberIds.length === 0 && (
                            <p className="text-sm text-gray-300">メンバー未設定</p>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-300 pl-3">役割未設定</p>
                )}
              </div>

              {/* フォーム項目 */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <h3 className="section-label">フォーム項目</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <p className="min-w-[90px] leading-[1.3rem] text-sm text-gray-400">
                      デフォルト項目
                    </p>
                    <p className="text-sm">
                      お名前・メールアドレス・電話番号
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <p className="min-w-[90px] leading-[1.3rem] text-sm text-gray-400">
                      カスタム項目
                    </p>
                    {formFields.length > 0 ? (
                      <ul className="space-y-2">
                        {formFields.map((field) => (
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
              </div>

              {/* 除外ルール */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <h3 className="section-label">除外ルール</h3>
                {newExclusionRules.length === 0 ? (
                  <p className="text-sm text-gray-300">除外ルール未設定</p>
                ) : (
                  <ul className="space-y-2">
                    {newExclusionRules.map((rule) => (
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
              </div>

              {/* リマインド */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <h3 className="section-label">リマインド</h3>
                {reminders.length > 0 ? (
                  <ul className="space-y-2">
                    {reminders.map((r) => (
                      <li key={r.id}>
                        <div className="text-sm flex items-center">
                          {"メール"}
                          <p className="text-xs ml-2">
                            （{r.timing_value}{r.timing_unit === "hours" ? "時間" : "日"}前）
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{r.message}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-300">リマインド未設定</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Float Area: Navigation buttons */}
      <div className="float-area max-w-5xl">
        <div className="max-w-5xl flex items-center justify-between">
          <button
            onClick={handleBack}
            className={cn(
              "btn btn-secondary",
              currentStepIndex === 0 && "invisible"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          {step === "confirm" ? (
            <button onClick={handleCreate} disabled={creating} className="btn btn-primary">
              {creating && <span className="spinner" />}
              イベントを作成
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn btn-primary"
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
