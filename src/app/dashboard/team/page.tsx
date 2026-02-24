"use client";

import { useState } from "react";
import {
  Users,
  Mail,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Plus,
  Search,
  MoreVertical,
  CalendarPlus,
  Trash2,
  Shield,
  Clock,
  CircleX,
  Filter,
  ChevronDown,
} from "lucide-react";
import {
  mockUsers,
  mockEventTypes,
  mockRoles,
  mockMembers,
  mockBookings,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import type { User } from "@/types";

export default function TeamPage() {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>(mockUsers);

  // モーダル・ダイアログの開閉状態
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [permissionUser, setPermissionUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "member">("member");
  const [savingPermission, setSavingPermission] = useState(false);

  // ローディング状態
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [reinvitingId, setReinvitingId] = useState<string | null>(null);

  const filteredUsers = users.filter(
    (u) =>
      !searchQuery ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getUserStats(userId: string) {
    const memberEntries = mockMembers.filter((m) => m.user_id === userId);
    const roleIds = memberEntries.map((m) => m.role_id);
    const eventIds = new Set(
      mockRoles
        .filter((r) => roleIds.includes(r.id))
        .map((r) => r.event_id)
    );
    const upcomingBookings = mockBookings.filter(
      (b) =>
        b.status === "confirmed" &&
        b.assigned_members?.some((am) => am.user_id === userId) &&
        new Date(b.start_time) >= new Date("2026-02-18")
    );
    return {
      eventCount: eventIds.size,
      upcomingBookings: upcomingBookings.length,
    };
  }

  const calendarStatusConfig: Record<
    NonNullable<User["calendar_status"]>,
    { label: string; icon: typeof CheckCircle2; className: string }
  > = {
    connected: {
      label: "接続済",
      icon: CheckCircle2,
      className: "badge-green",
    },
    error: {
      label: "エラー",
      icon: AlertTriangle,
      className: "badge-red",
    },
    not_connected: {
      label: "未接続",
      icon: XCircle,
      className: "badge-gray",
    },
  };

  const connectedCount = users.filter(
    (u) => u.status !== "invited" && u.calendar_status === "connected"
  ).length;
  const errorCount = users.filter(
    (u) => u.status !== "invited" && u.calendar_status === "error"
  ).length;
  const invitedCount = users.filter((u) => u.status === "invited").length;
  const notConnectedCount = users.filter((u) => u.calendar_status === "not_connected").length;

  // カレンダー再接続
  function handleReconnect(userId: string) {
    setReconnectingId(userId);
    setTimeout(() => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, calendar_status: "connected", last_synced_at: new Date().toISOString() }
            : u
        )
      );
      toast.success("カレンダーを再接続しました");
      setReconnectingId(null);
    }, 1500);
  }

  // カレンダー接続
  function handleConnect(userId: string) {
    setConnectingId(userId);
    setTimeout(() => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, calendar_status: "connected", last_synced_at: new Date().toISOString() }
            : u
        )
      );
      toast.success("カレンダーを接続しました");
      setConnectingId(null);
    }, 1500);
  }

  // 再招待
  function handleReinvite(user: User) {
    setReinvitingId(user.id);
    setTimeout(() => {
      setReinvitingId(null);
      toast.success(`${user.email} に招待メールを再送しました`);
    }, 1000);
  }

  // メンバー削除確認
  function handleDeleteConfirm() {
    if (!deleteTargetUser) return;
    setDeletingUser(true);
    setTimeout(() => {
      const name = deleteTargetUser.full_name;
      setUsers((prev) => prev.filter((u) => u.id !== deleteTargetUser.id));
      setDeleteTargetUser(null);
      setDeletingUser(false);
      toast.success(`${name} をチームから削除しました`);
    }, 1000);
  }

  // 権限変更モーダルを開く
  function openPermissionModal(user: User) {
    setNewRole(user.role ?? "member");
    setPermissionUser(user);
  }

  // 権限変更保存
  function handlePermissionSave() {
    if (!permissionUser) return;
    setSavingPermission(true);
    setTimeout(() => {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === permissionUser.id ? { ...u, role: newRole } : u
        )
      );
      const label = newRole === "admin" ? "管理者" : "メンバー";
      toast.success(`${permissionUser.full_name} の権限を「${label}」に変更しました`);
      setSavingPermission(false);
      setPermissionUser(null);
    }, 800);
  }

  return (
    <div>
      <header className="header mb-6">
        <div className="header-col">
          <h1 className="header-title">チームメンバー</h1>
          <p className="header-sub-title">
            メンバーとカレンダー連携の状態を管理します
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" />
          メンバー招待
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="rounded-xl p-6 flex items-center gap-5 bg-green-100/60">
          <CheckCircle2 className="h-5.5 w-5.5 text-green-600" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{connectedCount}</p>
            <p className="text-xs text-gray-500">カレンダー接続済み</p>
          </div>
        </div>
        <div className="rounded-xl p-6 flex items-center gap-5 bg-red-100/40">
          <AlertTriangle className="h-5.5 w-5.5 text-red-600" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{errorCount}</p>
            <p className="text-xs text-gray-500">エラー</p>
          </div>
        </div>
        <div className="rounded-xl p-6 flex items-center gap-5 bg-purple-100/50">
          <Clock className="h-5.5 w-5.5 text-purple-600" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{invitedCount}</p>
            <p className="text-xs text-gray-500">招待中</p>
          </div>
        </div>
        <div className="rounded-xl p-6 flex items-center gap-5 bg-gray-200/50">
          <CircleX className="h-5.5 w-5.5 text-gray-600" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{notConnectedCount}</p>
            <p className="text-xs text-gray-500">カレンダー接続なし</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="名前またはメールで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-9"
          />
        </div>

        {/* Filter */}
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={"all"}
            className="select appearance-none pl-9 pr-8 !py-1 min-w-[180px] h-[42px]"
          >
            <option value="all">すべての状態</option>
            <option value="1">接続済</option>
            <option value="2">エラー</option>
            <option value="3">招待中</option>
            <option value="4">未接続</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

      </div>

      {/* Member List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const isInvited = user.status === "invited";
          const stats = getUserStats(user.id);
          const calStatus =
            calendarStatusConfig[user.calendar_status || "not_connected"];
          const CalStatusIcon = calStatus.icon;
          const initial = user.full_name.charAt(0);
          const syncTimeStr = user.last_synced_at
            ? formatSyncTime(user.last_synced_at)
            : null;
          const isReconnecting = reconnectingId === user.id;
          const isConnecting = connectingId === user.id;
          const isReinviting = reinvitingId === user.id;

          return (
            <div
              key={user.id}
              role="button"
              tabIndex={0}
              aria-label={`${user.full_name} の詳細を見る`}
              onClick={() => setDetailUser(user)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDetailUser(user);
                }
              }}
              className="card card-clickable !p-0 transition-shadow hover:shadow-card-hover"
            >
              <div className="flex items-center gap-4 p-4">
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    isInvited
                      ? "bg-purple-100 text-purple-700"
                      : "bg-primary-100 text-primary-700"
                  )}
                >
                  {initial}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {user.full_name}
                    </h3>
                    {user.role === "admin" && !isInvited && (
                      <span className="badge badge-blue">管理者</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-5 shrink-0 mr-3">
                  {isInvited ? (
                    <>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-300">—</p>
                        <p className="text-xs text-gray-400">イベント</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-300">—</p>
                        <p className="text-xs text-gray-400">予定面接</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {stats.eventCount}
                        </p>
                        <p className="text-xs text-gray-500">イベント</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {stats.upcomingBookings}
                        </p>
                        <p className="text-xs text-gray-500">予定面接</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Status Badge */}
                {isInvited ? (
                  <div className="badge badge-purple">
                    <Clock className="h-3 w-3" />
                    招待中
                  </div>
                ) : (
                  <div
                    className={cn(
                      "badge",
                      calStatus.className
                    )}
                  >
                    <CalStatusIcon className="h-3 w-3" />
                    {calStatus.label}
                  </div>
                )}

                {/* Actions — カードクリックへの伝播を防ぐ */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {/* ドロップダウンメニュー */}
                  <DropdownMenu
                    align="right"
                    trigger={
                      <button
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
                        disabled={isReconnecting || isConnecting || isReinviting}
                      >
                        {isReconnecting || isConnecting || isReinviting ? (
                          <span className="spinner h-4 w-4" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </button>
                    }
                    items={
                      isInvited
                        ? [
                          {
                            label: "招待メールを再送",
                            icon: Mail,
                            onClick: () => handleReinvite(user),
                          },
                          { separator: true as const },
                          {
                            label: "招待を取り消す",
                            icon: XCircle,
                            variant: "danger" as const,
                            onClick: () => setDeleteTargetUser(user),
                          },
                        ]
                        : [
                          ...(user.calendar_status === "error"
                            ? [{
                              label: "カレンダーを再接続",
                              icon: RefreshCw,
                              onClick: () => handleReconnect(user.id),
                            }]
                            : []),
                          ...(user.calendar_status === "not_connected"
                            ? [{
                              label: "カレンダーを接続",
                              icon: CalendarPlus,
                              onClick: () => handleConnect(user.id),
                            }]
                            : []),
                          ...((user.calendar_status === "error" || user.calendar_status === "not_connected")
                            ? [{ separator: true as const }]
                            : []),
                          {
                            label: "権限を変更",
                            icon: Shield,
                            onClick: () => openPermissionModal(user),
                          },
                          { separator: true as const },
                          {
                            label: "メンバーを削除",
                            icon: Trash2,
                            variant: "danger" as const,
                            onClick: () => setDeleteTargetUser(user),
                          },
                        ]
                    }
                  />
                </div>
              </div>

              {/* Sync info bar */}
              {
                syncTimeStr && !isInvited && (
                  <div className="flex items-center gap-1.5 border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    最終同期: {syncTimeStr}
                  </div>
                )
              }
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="card flex flex-col items-center justify-center py-12">
            <Users className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">
              該当するメンバーが見つかりません
            </p>
          </div>
        )}
      </div>

      {/* メンバー招待モーダル */}
      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(email) => {
          setInviteOpen(false);
          toast.success(`${email} に招待メールを送信しました`);
        }}
      />

      {/* メンバー削除/招待取り消し確認ダイアログ */}
      <ConfirmDialog
        open={deleteTargetUser !== null}
        onClose={() => {
          if (!deletingUser) setDeleteTargetUser(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={
          deleteTargetUser?.status === "invited"
            ? "招待を取り消しますか？"
            : "メンバーを削除しますか？"
        }
        description={
          deleteTargetUser?.status === "invited"
            ? `${deleteTargetUser?.full_name} への招待を取り消します。この操作は取り消せません。`
            : `${deleteTargetUser?.full_name} をチームから削除します。この操作は取り消せません。`
        }
        confirmLabel={
          deleteTargetUser?.status === "invited" ? "取り消す" : "削除する"
        }
        confirmVariant="danger"
        loading={deletingUser}
      />

      {/* メンバー詳細モーダル */}
      <Modal
        open={detailUser !== null}
        onClose={() => setDetailUser(null)}
        title="メンバー詳細"
        size="md"
        footer={
          <button onClick={() => setDetailUser(null)} className="btn btn-ghost">
            閉じる
          </button>
        }
      >
        {detailUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold",
                  detailUser.status === "invited"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-primary-100 text-primary-700"
                )}
              >
                {detailUser.full_name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{detailUser.full_name}</p>
                <p className="text-sm text-gray-500">{detailUser.email}</p>
              </div>
            </div>
            <dl className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">権限</dt>
                <dd className="font-medium text-gray-900">
                  {detailUser.role === "admin" ? "管理者" : "メンバー"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">ステータス</dt>
                <dd className="font-medium text-gray-900">
                  {detailUser.status === "invited" ? "招待中" : "参加済み"}
                </dd>
              </div>
              {detailUser.status !== "invited" && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">カレンダー</dt>
                    <dd className="font-medium text-gray-900">
                      {calendarStatusConfig[detailUser.calendar_status || "not_connected"].label}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">最終同期</dt>
                    <dd className="font-medium text-gray-900">
                      {detailUser.last_synced_at
                        ? formatSyncTime(detailUser.last_synced_at)
                        : "未同期"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">担当イベント</dt>
                    <dd className="font-medium text-gray-900">
                      {getUserStats(detailUser.id).eventCount}件
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">予定面接</dt>
                    <dd className="font-medium text-gray-900">
                      {getUserStats(detailUser.id).upcomingBookings}件
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        )}
      </Modal>

      {/* 権限変更モーダル */}
      <Modal
        open={permissionUser !== null}
        onClose={() => setPermissionUser(null)}
        title="権限を変更"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setPermissionUser(null)}
              disabled={savingPermission}
              className="btn btn-ghost"
            >
              キャンセル
            </button>
            <button
              onClick={handlePermissionSave}
              disabled={savingPermission}
              className="btn btn-primary"
            >
              {savingPermission && <span className="spinner" />}
              変更する
            </button>
          </>
        }
      >
        {permissionUser && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <strong>{permissionUser.full_name}</strong> の権限を変更します。
            </p>
            <div>
              <label className="label">権限</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "member")}
                className="select mt-1"
              >
                <option value="member">メンバー（標準）</option>
                <option value="admin">管理者</option>
              </select>
              <p className="mt-1 text-xs text-gray-400">
                管理者はメンバーの追加・削除や設定変更が可能です
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div >
  );
}

// ============================================================
// メンバー招待モーダル
// ============================================================

function InviteMemberModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleClose() {
    if (loading) return;
    setEmail("");
    setRole("member");
    setError("");
    onClose();
  }

  function handleSubmit() {
    setError("");
    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("有効なメールアドレスを入力してください");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onInvited(email.trim());
      setEmail("");
      setRole("member");
    }, 1200);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="メンバーを招待"
      description="招待メールを送信します。相手が承認するとチームに参加できます。"
      size="md"
      footer={
        <>
          <button
            onClick={handleClose}
            disabled={loading}
            className="btn btn-ghost"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading && <span className="spinner" />}
            招待を送る
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="recruit@example.com"
            className={cn("input mt-1", error && "ring-red-400 focus:ring-red-500")}
            autoFocus
          />
          {error && (
            <p className="mt-1 text-xs text-red-500">{error}</p>
          )}
        </div>
        <div>
          <label className="label">権限</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="select mt-1"
          >
            <option value="member">メンバー（標準）</option>
            <option value="admin">管理者</option>
          </select>
          <p className="mt-1 text-xs text-gray-400">
            管理者はメンバーの追加・削除や設定変更が可能です
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatSyncTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
