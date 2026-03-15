"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Mail,
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
  CalendarSync,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { DropdownMenu } from "@/components/ui/DropdownMenu";

// ============================================================
// 型定義（API レスポンス形式）
// ============================================================
type TeamMember = {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: "admin" | "member";
  status: "active" | "invited";
  calendar_status?: "connected" | "error" | "not_connected";
  last_synced_at?: string;
};

export default function TeamPage() {
  const toast = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "connected" | "error" | "invited" | "not_connected"
  >("all");

  // モーダル・ダイアログの開閉状態
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<TeamMember | null>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [permissionMember, setPermissionMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "member">("member");
  const [savingPermission, setSavingPermission] = useState(false);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  // チームメンバー取得
  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error("メンバーの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  // フィルタリング
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "invited" && m.status === "invited") ||
      (statusFilter !== "invited" &&
        m.status !== "invited" &&
        m.calendar_status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  // サマリーカウント
  const connectedCount = members.filter(
    (m) => m.status !== "invited" && m.calendar_status === "connected"
  ).length;
  const errorCount = members.filter(
    (m) => m.status !== "invited" && m.calendar_status === "error"
  ).length;
  const invitedCount = members.filter((m) => m.status === "invited").length;
  const notConnectedCount = members.filter(
    (m) => !m.calendar_status || m.calendar_status === "not_connected"
  ).length;

  const calendarStatusConfig: Record<
    NonNullable<TeamMember["calendar_status"]>,
    { label: string; icon: typeof CheckCircle2; className: string }
  > = {
    connected: { label: "接続済", icon: CheckCircle2, className: "badge-green" },
    error: { label: "エラー", icon: AlertTriangle, className: "badge-red" },
    not_connected: { label: "未接続", icon: XCircle, className: "badge-gray" },
  };

  // 招待完了後にリストをリロード
  function handleInvited(email: string) {
    setInviteOpen(false);
    toast.success(`${email} に招待メールを送信しました`);
    fetchMembers();
  }

  // カレンダー再接続（フロントのみのモック操作 — Phase 4 で実装予定）
  function handleReconnect(memberId: string) {
    setReconnectingId(memberId);
    setTimeout(() => {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, calendar_status: "connected", last_synced_at: new Date().toISOString() }
            : m
        )
      );
      toast.success("カレンダーを再接続しました");
      setReconnectingId(null);
    }, 1500);
  }

  // メンバー削除
  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/team/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        const name = deleteTarget.full_name;
        setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        setDeleteTarget(null);
        toast.success(`${name} をチームから削除しました`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "削除に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setDeleting(false);
    }
  }

  // 権限変更モーダルを開く
  function openPermissionModal(member: TeamMember) {
    setNewRole(member.role ?? "member");
    setPermissionMember(member);
    setPermissionOpen(true);
  }

  // 権限変更保存
  async function handlePermissionSave() {
    if (!permissionMember) return;
    setSavingPermission(true);
    try {
      const res = await fetch(`/api/team/${permissionMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === permissionMember.id ? { ...m, role: newRole } : m
          )
        );
        const label = newRole === "admin" ? "管理者" : "メンバー";
        toast.success(`${permissionMember.full_name} の権限を「${label}」に変更しました`);
        setPermissionOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "権限の変更に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSavingPermission(false);
    }
  }

  return (
    <div>
      <header className="header mb-6">
        <div className="header-col">
          <h1 className="header-title">チームメンバー</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" />
          メンバー招待
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
        <div className="rounded-xl p-6 flex items-center gap-5 bg-green-100/60">
          <CheckCircle2 className="h-5.5 w-5.5 text-green-600" />
          <div>
            <p className="text-2xl font-semibold">{connectedCount}</p>
            <p className="text-xs text-gray-500">カレンダー接続済み</p>
          </div>
        </div>
        <div className="rounded-xl p-6 flex items-center gap-5 bg-red-100/40">
          <AlertTriangle className="h-5.5 w-5.5 text-red-600" />
          <div>
            <p className="text-2xl font-semibold">{errorCount}</p>
            <p className="text-xs text-gray-500">エラー</p>
          </div>
        </div>
        <div className="rounded-xl p-6 flex items-center gap-5 bg-purple-100/50">
          <Clock className="h-5.5 w-5.5 text-purple-600" />
          <div>
            <p className="text-2xl font-semibold">{invitedCount}</p>
            <p className="text-xs text-gray-500">招待中</p>
          </div>
        </div>
        <div className="rounded-xl p-6 flex items-center gap-5 bg-gray-200/50">
          <CircleX className="h-5.5 w-5.5 text-gray-600" />
          <div>
            <p className="text-2xl font-semibold">{notConnectedCount}</p>
            <p className="text-xs text-gray-500">カレンダー接続なし</p>
          </div>
        </div>
      </div>

      <div className="sticky-wrap py-3 mb-1">
        <div className="flex items-center gap-3">
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
          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="select appearance-none pl-9 pr-8 !py-1 min-w-[180px] h-[42px]"
            >
              <option value="all">すべての状態</option>
              <option value="connected">接続済</option>
              <option value="error">エラー</option>
              <option value="invited">招待中</option>
              <option value="not_connected">未接続</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Member List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-primary-600 animate-spin" />
          <p className="text-sm">読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => {
            const isInvited = member.status === "invited";
            const calStatus =
              calendarStatusConfig[member.calendar_status || "not_connected"];
            const CalStatusIcon = calStatus.icon;
            const initial = member.full_name.charAt(0);
            const syncTimeStr = member.last_synced_at
              ? formatSyncTime(member.last_synced_at)
              : null;
            const isReconnecting = reconnectingId === member.id;

            return (
              <div
                key={member.id}
                role="button"
                tabIndex={0}
                aria-label={`${member.full_name} の詳細を見る`}
                onClick={() => { setDetailMember(member); setDetailOpen(true); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailMember(member);
                    setDetailOpen(true);
                  }
                }}
                className="card card-clickable !p-0 transition-shadow hover:shadow-card-hover"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
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
                      <h3 className="text-sm font-semibold">{member.full_name}</h3>
                      {member.role === "admin" && !isInvited && (
                        <span className="badge badge-blue">管理者</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="h-3 w-3 text-gray-400" />
                      {member.email}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="w-[70px] flex justify-center">
                    {isInvited ? (
                      <div className="badge badge-purple">
                        <Clock className="h-3 w-3" />
                        招待中
                      </div>
                    ) : (
                      <div className={cn("badge", calStatus.className)}>
                        <CalStatusIcon className="h-3 w-3" />
                        {calStatus.label}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu
                      align="right"
                      trigger={
                        <button
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
                          disabled={isReconnecting}
                        >
                          {isReconnecting ? (
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
                                label: "招待を取り消す",
                                icon: XCircle,
                                variant: "danger" as const,
                                onClick: () => setDeleteTarget(member),
                              },
                            ]
                          : [
                              ...(member.calendar_status === "error"
                                ? [
                                    {
                                      label: "カレンダーを再接続",
                                      icon: RefreshCw,
                                      onClick: () => handleReconnect(member.id),
                                    },
                                  ]
                                : []),
                              ...(member.calendar_status === "not_connected"
                                ? [
                                    {
                                      label: "カレンダーを接続",
                                      icon: CalendarPlus,
                                      onClick: () => handleReconnect(member.id),
                                    },
                                  ]
                                : []),
                              ...((member.calendar_status === "error" ||
                                member.calendar_status === "not_connected")
                                ? [{ separator: true as const }]
                                : []),
                              {
                                label: "権限を変更",
                                icon: Shield,
                                onClick: () => openPermissionModal(member),
                              },
                              { separator: true as const },
                              {
                                label: "メンバーを削除",
                                icon: Trash2,
                                variant: "danger" as const,
                                onClick: () => setDeleteTarget(member),
                              },
                            ]
                      }
                    />
                  </div>
                </div>

                {/* Sync info bar */}
                {syncTimeStr && !isInvited && (
                  <div className="flex items-center gap-1.5 border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
                    <CalendarSync className="h-3 w-3" />
                    {syncTimeStr}
                  </div>
                )}
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="card flex flex-col items-center justify-center py-12">
              <Users className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">
                該当するメンバーが見つかりません
              </p>
            </div>
          )}
        </div>
      )}

      {/* メンバー招待モーダル */}
      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={handleInvited}
      />

      {/* メンバー削除/招待取り消し確認ダイアログ */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title={
          deleteTarget?.status === "invited"
            ? "招待を取り消しますか？"
            : "メンバーを削除しますか？"
        }
        description={
          deleteTarget?.status === "invited"
            ? `${deleteTarget?.full_name} への招待を取り消します。この操作は取り消せません。`
            : `${deleteTarget?.full_name} をチームから削除します。この操作は取り消せません。`
        }
        confirmLabel={deleteTarget?.status === "invited" ? "取り消す" : "削除する"}
        confirmVariant="danger"
        loading={deleting}
      />

      {/* メンバー詳細モーダル */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="メンバー詳細"
        size="md"
        footer={
          <button onClick={() => setDetailOpen(false)} className="btn btn-ghost">
            閉じる
          </button>
        }
      >
        {detailMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-md font-bold",
                  detailMember.status === "invited"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-primary-100 text-primary-700"
                )}
              >
                {detailMember.full_name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{detailMember.full_name}</p>
                <p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                  <Mail className="w-3 h-3" />
                  {detailMember.email}
                </p>
              </div>
            </div>
            <dl className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">権限</dt>
                <dd className="font-medium">
                  {detailMember.role === "admin" ? "管理者" : "メンバー"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">ステータス</dt>
                <dd className="font-medium">
                  {detailMember.status === "invited" ? "招待中" : "参加済み"}
                </dd>
              </div>
              {detailMember.status !== "invited" && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">カレンダー</dt>
                    <dd className="font-medium">
                      {calendarStatusConfig[detailMember.calendar_status || "not_connected"].label}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">最終同期</dt>
                    <dd className="font-medium">
                      {detailMember.last_synced_at
                        ? formatSyncTime(detailMember.last_synced_at)
                        : "未同期"}
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
        open={permissionOpen}
        onClose={() => setPermissionOpen(false)}
        title="権限を変更"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setPermissionOpen(false)}
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
        {permissionMember && (
          <div className="space-y-4">
            <p className="text-sm">
              <strong className="text-gray-500">{permissionMember.full_name}</strong>{" "}
              の権限を変更します。
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
    </div>
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

  async function handleSubmit() {
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
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (res.ok) {
        onInvited(email.trim());
        setEmail("");
        setRole("member");
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? "招待の送信に失敗しました");
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
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
          <button onClick={handleClose} disabled={loading} className="btn btn-ghost">
            キャンセル
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary">
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
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="recruit@example.com"
            className={cn("input mt-1", error && "ring-red-400 focus:ring-red-500")}
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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
  return new Date(timestamp).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
