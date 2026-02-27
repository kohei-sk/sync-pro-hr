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
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { cn, generateId } from "@/lib/utils";
import { addEventType } from "@/lib/event-store";
import { useToast } from "@/components/ui/Toast";
import { mockUsers } from "@/lib/mock-data";

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

type ReminderChannel = "email" | "sms" | "both";
type ReminderUnit = "hours" | "days";

type NewReminder = {
  id: string;
  channel: ReminderChannel;
  timing_value: number;
  timing_unit: ReminderUnit;
  message: string;
  is_enabled: boolean;
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
  const [step, setStep] = useState<Step>("basic");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    duration: 60,
    buffer_before: 15,
    buffer_after: 15,
    location_type: "online" as "online" | "in-person" | "phone",
    location_detail: "",
    scheduling_mode: "fixed" as "pool" | "fixed",
    color: "#3b82f6",
    isPublic: true,
  });

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

  const steps: { id: Step; label: string }[] = [
    { id: "basic",   label: "基本設定" },
    { id: "options", label: "オプション" },
    { id: "confirm", label: "確認" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

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

  // ステップ切替時にスクロール位置をリセット
  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
  }, [step]);

  function handleCreate() {
    const now = new Date().toISOString();
    addEventType({
      id: `evt-${Date.now()}`,
      user_id: "u1",
      title: formData.title,
      slug: formData.slug,
      description: formData.description || undefined,
      duration: formData.duration,
      buffer_before: formData.buffer_before,
      buffer_after: formData.buffer_after,
      location_type: formData.location_type,
      location_detail: formData.location_detail || undefined,
      status: formData.isPublic ? "active" : "draft",
      scheduling_mode: formData.scheduling_mode,
      color: formData.color,
      reminder_settings: reminders.length > 0
        ? reminders.map((r) => ({
            id: r.id,
            channel: r.channel,
            timing: { value: r.timing_value, unit: r.timing_unit },
            message: r.message,
            is_enabled: r.is_enabled,
          }))
        : undefined,
      created_at: now,
      updated_at: now,
    });
    toast.success("イベントを作成しました");
    router.push("/dashboard/events");
  }

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, "-")
      .replace(/^-|-$/g, "");
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
  }

  function removeMemberFromRole(roleId: string, userId: string) {
    setRoles(
      roles.map((r) => {
        if (r.id !== roleId) return r;
        return { ...r, memberIds: r.memberIds.filter((id) => id !== userId) };
      })
    );
  }

  function addFixedMember(userId: string) {
    if (!fixedMemberIds.includes(userId)) {
      setFixedMemberIds([...fixedMemberIds, userId]);
    }
    setFixedMemberDropdownOpen(false);
  }

  function removeFixedMember(userId: string) {
    setFixedMemberIds(fixedMemberIds.filter((id) => id !== userId));
  }

  function addExclusionRule() {
    if (!exclusionDraft.name.trim()) return;
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
    if (!fieldDraft.label.trim()) return;
    setFormFields([...formFields, { ...fieldDraft, id: generateId() }]);
    setFieldDraft({ ...EMPTY_FIELD_DRAFT });
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
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const totalMembers = formData.scheduling_mode === "fixed"
    ? fixedMemberIds.length
    : roles.reduce((acc, r) => acc + r.memberIds.length, 0);

  return (
    <div>
      {/* Header */}
      <header className="header mb-8">
        <Link
          href="/dashboard/events"
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 ring-1 ring-gray-200 hover:bg-gray-50 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="header-col">
          <h1 className="header-title">
            新規イベント作成
          </h1>
          <p className="header-sub-title">
            イベントの基本情報を入力して作成します
          </p>
        </div>
      </header>

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
      <div className="max-w-3xl pb-24">
        {/* Step 1: Basic Settings + Team */}
        {step === "basic" && (
          <div className="space-y-4">
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
                  <span className="pl-4 text-sm text-gray-500">/j/</span>
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
            <div className="card">
            <h2 className="step-section-title">メンバー設定</h2>
            <p className="mt-1 text-sm text-gray-500">
              面接に参加するメンバーの役割と配分を設定します
            </p>
            <div className="mt-6 space-y-5">
              {/* Scheduling mode */}
              <div>
                <label className="label">スケジューリングモード</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
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
                    <Lock className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        固定モード
                      </h4>
                      <p className="mt-1 text-xs text-gray-500">
                        指定メンバー全員が空いている枠のみ表示
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
                    <Users className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        プールモード
                      </h4>
                      <p className="mt-1 text-xs text-gray-500">
                        役割ごとに必要人数を満たす枠を自動選出
                      </p>
                    </div>
                  </button>
                </div>
                <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-600">
                    {formData.scheduling_mode === "fixed"
                      ? "固定モードでは、全メンバーの空き時間が一致する枠のみが候補者に表示されます。少人数の面接に適しています。"
                      : "プールモードでは、役割ごとに必要人数を設定し、条件を満たす枠が自動で選出されます。大人数の面接パネルに適しています。"}
                  </p>
                </div>
              </div>

              {/* Fixed mode */}
              {formData.scheduling_mode === "fixed" ? (
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
                            const user = mockUsers.find((u) => u.id === userId);
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
                          <div className="absolute left-0 top-full z-10 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                            {mockUsers
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
                            {mockUsers.filter((u) => !fixedMemberIds.includes(u.id)).length === 0 && (
                              <p className="px-3 py-2 text-sm text-gray-400">
                                追加できるメンバーがいません
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Pool mode */
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
                                <div className="flex items-center gap-3">
                                  {handle}
                                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1 text-xs font-semibold text-gray-600 shrink-0">
                                    {roleIndex + 1}
                                  </span>
                                  <input
                                    type="text"
                                    className="input flex-1"
                                    value={role.name}
                                    onChange={(e) =>
                                      updateRole(role.id, { name: e.target.value })
                                    }
                                    placeholder="役割名（例: 面接官）"
                                  />
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
                                        const user = mockUsers.find((u) => u.id === userId);
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
                                      <div className="absolute left-0 top-full z-10 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                                        {mockUsers
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
                                        {mockUsers.filter(
                                          (u) => !role.memberIds.includes(u.id)
                                        ).length === 0 && (
                                            <p className="px-3 py-2 text-sm text-gray-400">
                                              追加できるメンバーがいません
                                            </p>
                                          )}
                                      </div>
                                    )}
                                  </div>
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
            </div>
            </div>
          </div>
        )}

        {/* Step 2: Options (Exclusions + Form + Reminder) */}
        {step === "options" && (
          <div className="space-y-4">
            <div className="card">
            <h2 className="step-section-title">除外ルール</h2>
            <p className="mt-1 text-sm text-gray-500">
              特定の日時をスケジュール対象外に設定します（省略可能）
            </p>
            <div className="mt-6 space-y-4">
              {/* Existing rules list */}
              {newExclusionRules.length > 0 && (
                <div className="space-y-2">
                  {newExclusionRules.map((rule) => (
                    <div key={rule.id}>
                      {editingExclusionId === rule.id ? (
                        /* Edit form for this rule */
                        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 space-y-3">
                          <p className="text-sm font-semibold text-gray-900">除外ルールを編集</p>
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
                            <button onClick={() => setEditingExclusionId(null)} className="btn btn-secondary">キャンセル</button>
                            <button onClick={() => saveEditExclusionRule(rule.id)} disabled={!editExclusionDraft.name.trim()} className="btn btn-primary">保存</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{rule.name}</p>
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
                <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">新しい除外ルール</p>
                  <div>
                    <label className="label">ルール名</label>
                    <input
                      type="text"
                      className="input mt-1"
                      value={exclusionDraft.name}
                      onChange={(e) => setExclusionDraft({ ...exclusionDraft, name: e.target.value })}
                      placeholder="例: 昼休み、全社定例会議"
                    />
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
                        <span>{exclusionDraft.recurring ? "繰り返し" : "1回限り"}</span>
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
                          className="input mt-1"
                          value={exclusionDraft.specific_date ?? ""}
                          onChange={(e) =>
                            setExclusionDraft({ ...exclusionDraft, specific_date: e.target.value })
                          }
                        />
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
                      onClick={() => setShowExclusionForm(false)}
                      className="btn btn-secondary"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={addExclusionRule}
                      disabled={!exclusionDraft.name.trim()}
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
              候補者に入力してもらう追加項目を設定します（省略可能）
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
              {formFields.length > 0 && (
                <div className="space-y-2">
                  <p className="label">カスタム項目</p>
                  {formFields.map((field) => (
                    <div key={field.id}>
                      {editingFieldId === field.id ? (
                        <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-3">
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
                            <button onClick={() => setEditingFieldId(null)} className="btn btn-secondary">キャンセル</button>
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
                  ))}
                </div>
              )}

              {/* Add field form */}
              {showFieldForm ? (
                <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-900">新しい項目</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">ラベル名</label>
                      <input type="text" className="input mt-1" value={fieldDraft.label} onChange={(e) => setFieldDraft({ ...fieldDraft, label: e.target.value })} placeholder="例: 希望年収" />
                    </div>
                    <div>
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
                    <button onClick={() => { setShowFieldForm(false); setFieldDraft({ ...EMPTY_FIELD_DRAFT }); }} className="btn btn-secondary">キャンセル</button>
                    <button onClick={addFormField} disabled={!fieldDraft.label.trim()} className="btn btn-primary">追加</button>
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
                    <div
                      key={reminder.id}
                      className="rounded-xl border border-gray-200 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {reminder.channel === "email" ? (
                            <Mail className="h-4 w-4 text-primary-500" />
                          ) : reminder.channel === "sms" ? (
                            <MessageSquare className="h-4 w-4 text-primary-500" />
                          ) : (
                            <Bell className="h-4 w-4 text-primary-500" />
                          )}
                          <span className="text-sm font-medium text-gray-700">
                            {{ email: "メール", sms: "SMS", both: "メール + SMS" }[reminder.channel]}
                            &nbsp;/&nbsp;
                            {reminder.timing_value}{reminder.timing_unit === "hours" ? "時間" : "日"}前
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setReminders(reminders.filter((r) => r.id !== reminder.id))}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="label">送信チャネル</label>
                          <select
                            className="select mt-1"
                            value={reminder.channel}
                            onChange={(e) =>
                              setReminders(reminders.map((r) =>
                                r.id === reminder.id ? { ...r, channel: e.target.value as ReminderChannel } : r
                              ))
                            }
                          >
                            <option value="email">メール</option>
                            <option value="sms">SMS</option>
                            <option value="both">メール + SMS</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">タイミング（数値）</label>
                          <input
                            type="number"
                            className="input mt-1"
                            min={1}
                            value={reminder.timing_value}
                            onChange={(e) =>
                              setReminders(reminders.map((r) =>
                                r.id === reminder.id ? { ...r, timing_value: parseInt(e.target.value) || 1 } : r
                              ))
                            }
                          />
                        </div>
                        <div>
                          <label className="label">単位</label>
                          <select
                            className="select mt-1"
                            value={reminder.timing_unit}
                            onChange={(e) =>
                              setReminders(reminders.map((r) =>
                                r.id === reminder.id ? { ...r, timing_unit: e.target.value as ReminderUnit } : r
                              ))
                            }
                          >
                            <option value="hours">時間前</option>
                            <option value="days">日前</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label">メッセージ内容</label>
                        <textarea
                          className="input mt-1 min-h-[80px] resize-y"
                          placeholder="候補者に送るメッセージを入力してください。&#10;{{date}}、{{location}} でスロット情報を挿入できます。"
                          value={reminder.message}
                          onChange={(e) =>
                            setReminders(reminders.map((r) =>
                              r.id === reminder.id ? { ...r, message: e.target.value } : r
                            ))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() =>
                  setReminders([
                    ...reminders,
                    {
                      id: generateId(),
                      channel: "email",
                      timing_value: 24,
                      timing_unit: "hours",
                      message: "",
                      is_enabled: true,
                    },
                  ])
                }
                className="add-btn"
              >
                <Plus className="h-4 w-4" />
                リマインドを追加
              </button>

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
            <div className="mt-6 space-y-3">

              {/* 基本設定 */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="section-label">基本設定</p>
                <dl className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">イベント名</dt>
                    <dd className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: formData.color }}
                      />
                      {formData.title || "未入力"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">URL</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      /j/{formData.slug || "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">公開設定</dt>
                    <dd className="flex items-center gap-1.5 text-sm font-medium">
                      {formData.isPublic ? (
                        <>
                          <Globe className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-700">公開</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                          <span className="text-gray-600">非公開（下書き）</span>
                        </>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 日程・場所 */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="section-label">日程・場所</p>
                <dl className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">所要時間</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.duration}分
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">バッファ</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      前{formData.buffer_before}分 / 後{formData.buffer_after}分
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
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
                  <div className="flex items-center justify-between">
                    <dt className="text-sm text-gray-500">スケジューリング</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.scheduling_mode === "fixed"
                        ? "固定モード"
                        : "プールモード"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* チーム構成 */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="section-label">チーム構成</p>
                {formData.scheduling_mode === "fixed" ? (
                  fixedMemberIds.length > 0 ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900">メンバー</span>
                        <span className="ml-2 text-xs text-gray-500">{fixedMemberIds.length}人</span>
                      </div>
                      <div className="flex -space-x-1">
                        {fixedMemberIds.slice(0, 4).map((userId) => {
                          const user = mockUsers.find((u) => u.id === userId);
                          return (
                            <div
                              key={userId}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 ring-2 ring-white"
                              title={user?.full_name}
                            >
                              {user?.full_name.charAt(0) || "?"}
                            </div>
                          );
                        })}
                        {fixedMemberIds.length > 4 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 ring-2 ring-white">
                            +{fixedMemberIds.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">メンバー未設定</p>
                  )
                ) : roles.length > 0 ? (
                  <div className="space-y-2">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {role.name || "（未入力）"}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            必要人数: {role.required_count}人
                          </span>
                        </div>
                        <div className="flex -space-x-1">
                          {role.memberIds.slice(0, 4).map((userId) => {
                            const user = mockUsers.find((u) => u.id === userId);
                            return (
                              <div
                                key={userId}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 ring-2 ring-white"
                                title={user?.full_name}
                              >
                                {user?.full_name.charAt(0) || "?"}
                              </div>
                            );
                          })}
                          {role.memberIds.length > 4 && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 ring-2 ring-white">
                              +{role.memberIds.length - 4}
                            </div>
                          )}
                          {role.memberIds.length === 0 && (
                            <span className="text-xs text-gray-400">
                              メンバーなし
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">役割未設定</p>
                )}
              </div>

              {/* フォーム */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="section-label">フォーム項目</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span>デフォルト3件（お名前・メールアドレス・電話番号）</span>
                  </div>
                  {formFields.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span>カスタム{formFields.length}件</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 除外ルール */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="section-label">除外ルール</p>
                <p className="text-sm text-gray-700">
                  {newExclusionRules.length > 0
                    ? `${newExclusionRules.length}件設定`
                    : "なし"}
                </p>
              </div>

              {/* リマインド */}
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="section-label">リマインド</p>
                {reminders.length > 0 ? (
                  <div className="space-y-1.5">
                    {reminders.map((r) => (
                      <div key={r.id} className="flex items-center gap-1.5 text-sm text-gray-700">
                        {r.channel === "email" ? (
                          <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        ) : r.channel === "sms" ? (
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        ) : (
                          <Bell className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        )}
                        <span>
                          {{ email: "メール", sms: "SMS", both: "メール + SMS" }[r.channel]}
                          &nbsp;/&nbsp;
                          {r.timing_value}{r.timing_unit === "hours" ? "時間" : "日"}前
                          {!r.is_enabled && <span className="ml-1 text-gray-400">（無効）</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">なし</p>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Float Area: Navigation buttons */}
      <div className="float-area">
        <div className="max-w-3xl flex items-center justify-between">
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
            <button onClick={handleCreate} className="btn btn-primary">
              イベントを作成
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={step === "basic" && !formData.title.trim()}
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
