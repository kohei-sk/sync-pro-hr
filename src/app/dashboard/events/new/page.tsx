"use client";

import { useState } from "react";
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
import { mockUsers } from "@/lib/mock-data";

type Step = "basic" | "team" | "exclusions" | "confirm";

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

type NewRole = {
  id: string;
  name: string;
  required_count: number;
  memberIds: string[];
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
    scheduling_mode: "pool" as "pool" | "fixed",
    color: "#3b82f6",
    isPublic: false,
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

  const steps: { id: Step; label: string }[] = [
    { id: "basic", label: "基本設定" },
    { id: "team", label: "チーム設定" },
    { id: "exclusions", label: "除外ルール" },
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
      created_at: now,
      updated_at: now,
    });
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
        {/* Step 1: Basic Settings */}
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
        )}

        {/* Step 2: Team Settings */}
        {step === "team" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              チーム設定
            </h2>
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
                <div className="mt-3 rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">
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
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                                      {user?.full_name.charAt(0) || "?"}
                                    </div>
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
                                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                                                  {user?.full_name.charAt(0) || "?"}
                                                </div>
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
        )}

        {/* Step 3: Exclusion Rules */}
        {step === "exclusions" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">除外ルール</h2>
            <p className="mt-1 text-sm text-gray-500">
              特定の日時をスケジュール対象外に設定します（省略可能）
            </p>
            <div className="mt-6 space-y-4">
              {/* Existing rules list */}
              {newExclusionRules.length > 0 && (
                <div className="space-y-2">
                  {newExclusionRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                    >
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
                      <button
                        onClick={() => removeExclusionRule(rule.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
                  <div className="grid grid-cols-2 gap-3">
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
                          "mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset transition-colors",
                          exclusionDraft.recurring
                            ? "bg-primary-50 ring-primary-300 text-primary-700"
                            : "bg-white ring-gray-300 text-gray-600"
                        )}
                      >
                        <span>{exclusionDraft.recurring ? "繰り返しあり" : "1回限り"}</span>
                        <div className={cn(
                          "relative inline-flex h-5 w-9 rounded-full transition-colors",
                          exclusionDraft.recurring ? "bg-primary-500" : "bg-gray-300"
                        )}>
                          <span className={cn(
                            "inline-block h-4 w-4 rounded-full bg-white shadow-sm mt-0.5 transition-transform",
                            exclusionDraft.recurring ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                          )} />
                        </div>
                      </button>
                    </div>
                  </div>

                  {exclusionDraft.recurring ? (
                    <div>
                      <label className="label">曜日（空白 = 毎日）</label>
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
                    <div className="grid grid-cols-2 gap-3">
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
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowExclusionForm(false)}
                      className="btn-secondary text-sm"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={addExclusionRule}
                      disabled={!exclusionDraft.name.trim()}
                      className="btn-primary text-sm"
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
                    <dd className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: formData.color }}
                      />
                      {formData.title || "未入力"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">URL</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      /j/{formData.slug || "\u2014"}
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
                  <div className="flex justify-between">
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
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">チームメンバー</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formData.scheduling_mode === "fixed"
                        ? `${totalMembers}人`
                        : `${totalMembers}人（${roles.length}役割）`}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">除外ルール</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {newExclusionRules.length > 0
                        ? `${newExclusionRules.length}件`
                        : "なし"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Team summary */}
              {formData.scheduling_mode === "fixed" ? (
                fixedMemberIds.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      チーム構成
                    </p>
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
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
                  </div>
                )
              ) : (
                roles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      チーム構成
                    </p>
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
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
                )
              )}
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
            <ArrowLeft className="h-4 w-4" />
            戻る
          </button>
          {step === "confirm" ? (
            <button onClick={handleCreate} className="btn-primary">
              イベントを作成
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={step === "basic" && !formData.title.trim()}
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
