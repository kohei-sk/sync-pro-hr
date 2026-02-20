"use client";

import { useState } from "react";
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
  Lock,
  Globe,
  EyeOff,
  CheckCircle2,
  Pencil,
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
import { cn, generateId } from "@/lib/utils";
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
  FieldType,
} from "@/types";

type TabId = "basic" | "team" | "exclusions" | "form";

const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: "basic", label: "基本設定", icon: Settings },
  { id: "team", label: "チーム", icon: Users },
  { id: "exclusions", label: "除外ルール", icon: ShieldOff },
  { id: "form", label: "フォーム", icon: FileText },
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
                  "badge",
                  event.status === "active"
                    ? "badge badge-green"
                    : "badge badge-gray"
                )}
              >
                {event.status === "active" ? "公開中" : "非公開"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{event.description}</p>
          </div>
          <Link
            href={`/j/${event.slug}`}
            target="blank"
            className="btn-tertiary"
          >
            <ExternalLink className="h-4 w-4" />
            プレビュー
          </Link>
          <button
            onClick={handleDelete}
            className="btn-danger"
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
            <ExclusionsTab rules={exclusionRules} eventId={eventId} />
          )}
          {activeTab === "form" && (
            <FormTab fields={customFields} eventId={eventId} />
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
  const [saved, setSaved] = useState(false);

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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fixed mode: add member
  function addFixedMember(userId: string) {
    if (!fixedMemberIds.includes(userId)) {
      setFixedMemberIds([...fixedMemberIds, userId]);
    }
    setShowMemberPicker(false);
  }

  function removeFixedMember(userId: string) {
    setFixedMemberIds(fixedMemberIds.filter((id) => id !== userId));
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
  }

  function removeRole(roleId: string) {
    setLocalRoles(localRoles.filter((r) => r.id !== roleId));
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
  }

  function removeMemberFromRole(roleId: string, userId: string) {
    setLocalRoles(
      localRoles.map((r) => {
        if (r.id !== roleId) return r;
        return { ...r, memberIds: r.memberIds.filter((id) => id !== userId) };
      })
    );
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
    }
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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

      {/* Fixed mode */}
      {mode === "fixed" ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              メンバー
              <span className="ml-1.5 text-xs text-gray-400">（上から優先度順）</span>
            </p>
            <div className="relative">
              <button
                onClick={() => setShowMemberPicker(!showMemberPicker)}
                className="btn-tertiary"
              >
                <Plus className="h-4 w-4" />
                メンバーを追加
              </button>
              {showMemberPicker && (
                <div className="absolute right-0 top-full z-10 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
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
                    const user = mockUsers.find((u) => u.id === userId);
                    return (
                      <SortableRow key={userId} id={userId}>
                        {(handle) => (
                          <div className="flex items-center gap-3 px-4 py-3">
                            {handle}
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-100 px-1 text-xs font-semibold text-primary-700 shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                              {user?.full_name.charAt(0) || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
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
          </div>
        </div>
      ) : (
        /* Pool mode */
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">役割とメンバー</p>
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
                      <div className="rounded-2xl border border-gray-200 p-4">
                        {/* Role header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {handle}
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-semibold text-gray-600 shrink-0">
                              {roleIndex + 1}
                            </span>
                            <span className="font-medium text-gray-900">{role.name}</span>
                            <span className="text-sm text-gray-500">(必要人数: {role.required_count}人)</span>
                          </div>
                          <button
                            onClick={() => removeRole(role.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                                  const user = mockUsers.find((u) => u.id === userId);
                                  return (
                                    <SortableRow key={userId} id={userId}>
                                      {(memberHandle) => (
                                        <div className="flex items-center gap-2 px-3 py-2.5">
                                          {memberHandle}
                                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-50 px-1 text-xs font-semibold text-primary-600 shrink-0">
                                            {memberIndex + 1}
                                          </span>
                                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 shrink-0">
                                            {user?.full_name.charAt(0) || "?"}
                                          </div>
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
                                {mockUsers
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
                                {mockUsers.filter((u) => !role.memberIds.includes(u.id)).length === 0 && (
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

            {/* Add role */}
            {showAddRoleForm ? (
              <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 space-y-3">
                <div>
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
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowAddRoleForm(false);
                      setNewRoleName("");
                      setNewRoleCount(1);
                    }}
                    className="btn-secondary text-sm"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddRole}
                    disabled={!newRoleName.trim()}
                    className="btn-primary text-sm"
                  >
                    追加
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddRoleForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                役割を追加
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={handleSave} className="btn-primary">変更を保存</button>
      </div>

      {saved && (
        <div className="toast">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-gray-700">変更を保存しました</span>
        </div>
      )}
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

function ExclusionsTab({ rules, eventId }: { rules: ExclusionRule[]; eventId: string }) {
  const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];

  const [localRules, setLocalRules] = useState<ExclusionRule[]>(rules);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState<ExclusionDraft>({ ...EMPTY_EXCLUSION_DRAFT });
  const [editDraft, setEditDraft] = useState<ExclusionDraft>({ ...EMPTY_EXCLUSION_DRAFT });
  const [saved, setSaved] = useState(false);

  function handleAddSave() {
    if (!addDraft.name.trim()) return;
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
  }

  function handleDelete(ruleId: string) {
    setLocalRules(localRules.filter((r) => r.id !== ruleId));
  }

  function handleSaveAll() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function renderExclusionForm(
    draft: ExclusionDraft,
    setDraft: (d: ExclusionDraft) => void,
    onSave: () => void,
    onCancel: () => void,
    saveLabel = "保存"
  ) {
    return (
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 space-y-3">
        <div>
          <label className="label">ルール名</label>
          <input
            type="text"
            className="input mt-1"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="例: 昼休み"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">タイプ</label>
            <select
              className="select mt-1"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as "all-day" | "time-range" })}
            >
              <option value="all-day">終日</option>
              <option value="time-range">時間帯</option>
            </select>
          </div>
          <div>
            <label className="label">繰り返し</label>
            <button
              onClick={() => setDraft({ ...draft, recurring: !draft.recurring })}
              className={cn(
                "mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset transition-colors",
                draft.recurring
                  ? "bg-primary-50 ring-primary-300 text-primary-700"
                  : "bg-white ring-gray-300 text-gray-600"
              )}
            >
              <span>{draft.recurring ? "繰り返しあり" : "1回限り"}</span>
              <div className={cn("relative inline-flex h-5 w-9 rounded-full transition-colors",
                draft.recurring ? "bg-primary-500" : "bg-gray-300"
              )}>
                <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm mt-0.5 transition-transform",
                  draft.recurring ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                )} />
              </div>
            </button>
          </div>
        </div>
        {draft.recurring ? (
          <div>
            <label className="label">曜日（空白 = 毎日）</label>
            <select
              className="select mt-1"
              value={draft.day_of_week ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  day_of_week: e.target.value === "" ? undefined : parseInt(e.target.value),
                })
              }
            >
              <option value="">毎日</option>
              {daysOfWeek.map((d, i) => (
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
              value={draft.specific_date ?? ""}
              onChange={(e) => setDraft({ ...draft, specific_date: e.target.value })}
            />
          </div>
        )}
        {draft.type === "time-range" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">開始時刻</label>
              <input type="time" className="input mt-1"
                value={draft.start_time ?? "09:00"}
                onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} />
            </div>
            <div>
              <label className="label">終了時刻</label>
              <input type="time" className="input mt-1"
                value={draft.end_time ?? "10:00"}
                onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} />
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="btn-secondary text-sm">キャンセル</button>
          <button onClick={onSave} disabled={!draft.name.trim()} className="btn-primary text-sm">
            {saveLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">除外ルール</h3>
          <p className="text-sm text-gray-500">特定の日時をスケジュール対象外にします</p>
        </div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-tertiary">
            <Plus className="h-4 w-4" />
            ルールを追加
          </button>
        )}
      </div>

      {showAddForm && renderExclusionForm(
        addDraft,
        setAddDraft,
        handleAddSave,
        () => { setShowAddForm(false); setAddDraft({ ...EMPTY_EXCLUSION_DRAFT }); },
        "追加"
      )}

      {localRules.length === 0 && !showAddForm ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <ShieldOff className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">除外ルールはまだ設定されていません</p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {localRules.map((rule) => (
            <div key={rule.id}>
              {editingId === rule.id ? (
                renderExclusionForm(
                  editDraft,
                  setEditDraft,
                  () => handleEditSave(rule.id),
                  () => setEditingId(null),
                  "保存"
                )
              ) : (
                <div className="flex items-center justify-between rounded-2xl border border-gray-200 p-4">
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
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={handleSaveAll} className="btn-primary">変更を保存</button>
      </div>

      {saved && (
        <div className="toast">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-gray-700">変更を保存しました</span>
        </div>
      )}
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

function FormTab({ fields, eventId }: { fields: CustomField[]; eventId: string }) {
  const fieldTypeLabels: Record<string, string> = {
    text: "テキスト",
    email: "メール",
    tel: "電話番号",
    multiline: "複数行テキスト",
    url: "URL",
    file: "ファイル",
  };

  const [localFields, setLocalFields] = useState<CustomField[]>(
    [...fields].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState<FieldDraft>({ ...EMPTY_FIELD_DRAFT });
  const [editDraft, setEditDraft] = useState<FieldDraft>({ ...EMPTY_FIELD_DRAFT });
  const [saved, setSaved] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    if (!addDraft.label.trim()) return;
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
  }

  function handleDelete(fieldId: string) {
    setLocalFields(localFields.filter((f) => f.id !== fieldId));
  }

  function handleSaveAll() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function renderFieldForm(
    draft: FieldDraft,
    setDraft: (d: FieldDraft) => void,
    onSave: () => void,
    onCancel: () => void,
    formId: string,
    saveLabel = "保存"
  ) {
    return (
      <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">ラベル名</label>
            <input
              type="text"
              className="input mt-1"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="例: 希望年収"
            />
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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`is-required-${formId}`}
            checked={draft.is_required}
            onChange={(e) => setDraft({ ...draft, is_required: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor={`is-required-${formId}`} className="text-sm text-gray-700">必須項目にする</label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="btn-secondary text-sm">キャンセル</button>
          <button onClick={onSave} disabled={!draft.label.trim()} className="btn-primary text-sm">
            {saveLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">カスタムフォーム項目</h3>
          <p className="text-sm text-gray-500">
            候補者に入力してもらう項目を設定します
          </p>
        </div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-tertiary">
            <Plus className="h-4 w-4" />
            項目を追加
          </button>
        )}
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
            <span className="text-sm font-medium text-gray-500">{field.label}</span>
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

      {/* Add form */}
      {showAddForm && renderFieldForm(
        addDraft,
        setAddDraft,
        handleAddField,
        () => { setShowAddForm(false); setAddDraft({ ...EMPTY_FIELD_DRAFT }); },
        "new",
        "追加"
      )}

      {/* Custom fields */}
      {localFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            カスタム項目
          </p>
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
                    renderFieldForm(
                      editDraft,
                      setEditDraft,
                      () => handleEditSave(field.id),
                      () => setEditingId(null),
                      field.id,
                      "保存"
                    )
                  ) : (
                    <SortableRow id={field.id}>
                      {(handle) => (
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                          <div className="flex items-center gap-3">
                            {handle}
                            <span className="text-sm font-medium text-gray-700">{field.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {fieldTypeLabels[field.type] || field.type}
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
        </div>
      )}

      {localFields.length === 0 && !showAddForm && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            カスタム項目はまだ追加されていません
          </p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={handleSaveAll} className="btn-primary">変更を保存</button>
      </div>

      {saved && (
        <div className="toast">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-gray-700">変更を保存しました</span>
        </div>
      )}
    </div>
  );
}
