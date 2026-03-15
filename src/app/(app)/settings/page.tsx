"use client";

import { useRef, useState, useEffect } from "react";
import {
  User,
  Bell,
  Calendar,
  Globe,
  Save,
  CheckCircle2,
  Link2,
  Clock,
  Shield,
  ImagePlus,
  MessageSquare,
  ExternalLink,
  Link,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TAB_SCROLL_OFFSET } from "@/lib/constants";
import { useToast } from "@/components/ui/Toast";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { invalidateUser } from "@/lib/user-store";

// ============================================================
// Types
// ============================================================

type Tab = "profile" | "notifications" | "calendar" | "general";

interface MessagingIntegrationState {
  connected: boolean;
  loading: boolean;
}

// ============================================================
// Tab 定義
// ============================================================

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "プロフィール", icon: User },
  { id: "notifications", label: "通知設定", icon: Bell },
  { id: "calendar", label: "連携設定", icon: Link },
  { id: "general", label: "一般設定", icon: Globe },
];

// ============================================================
// Page
// ============================================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // URLパラメータ ?tab=... からタブを初期化
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (
      tab === "profile" ||
      tab === "notifications" ||
      tab === "calendar" ||
      tab === "general"
    ) {
      setActiveTab(tab as Tab);
    }
  }, []);

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

  return (
    <div>
      <header className="header mb-6">
        <div className="header-col">
          <h1 className="header-title">設定</h1>
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
                activeTab === tab.id ? "tab-item-active" : ""
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl">
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "general" && <GeneralTab />}
      </div>
    </div>
  );
}

// ============================================================
// ProfileTab
// ============================================================

function ProfileTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timezone, setTimezone] = useState("Asia/Tokyo");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((data) => {
        setCompany(data.company_name ?? "");
        setName(data.full_name ?? "");
        setEmail(data.email ?? "");
        setTimezone(data.timezone ?? "Asia/Tokyo");
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, timezone }),
      });
      if (!res.ok) throw new Error();
      invalidateUser();
      toast.success("基本情報を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSavingProfile(false);
    }
  }

  function handleSavePassword() {
    setSavingPassword(true);
    setTimeout(() => {
      setSavingPassword(false);
      toast.success("パスワードを変更しました");
    }, 800);
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <span className="spinner" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card">
        <h2 className="text-md font-semibold mb-4">基本情報</h2>
        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 overflow-hidden">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="プロフィール画像"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-primary-700">
                  {name ? name.charAt(0) : "?"}
                </span>
              )}
            </div>
            <div>
              <button
                className="btn btn-secondary btn-size-s"
                onClick={() => setUploadModalOpen(true)}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                画像を変更
              </button>
              <p className="mt-1 text-xs text-gray-400">JPG, PNG 最大 2MB</p>
            </div>
          </div>

          <div>
            <label className="label">会社名</label>
            <input
              type="text"
              value={company}
              className="input mt-1"
              disabled
              readOnly
            />
            <p className="mt-1 text-xs text-gray-400">会社名は変更できません</p>
          </div>

          <div>
            <label className="label">氏名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="label">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
            />
          </div>

          <div>
            <label className="label">タイムゾーン</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="select mt-1"
            >
              <option value="Asia/Tokyo">Asia/Tokyo (JST, UTC+9)</option>
              <option value="America/New_York">
                America/New_York (EST, UTC-5)
              </option>
              <option value="Europe/London">Europe/London (GMT, UTC+0)</option>
              <option value="Asia/Shanghai">
                Asia/Shanghai (CST, UTC+8)
              </option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="btn btn-primary"
          >
            {savingProfile ? (
              <span className="spinner" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存
          </button>
        </div>
      </div>

      {/* Password Section */}
      <div className="card">
        <h2 className="text-md font-semibold mb-4">セキュリティ</h2>
        <div className="space-y-4">
          <div>
            <label className="label">現在のパスワード</label>
            <input
              type="password"
              placeholder="••••••••"
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label">新しいパスワード</label>
            <input
              type="password"
              placeholder="8文字以上"
              className="input mt-1"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
          <button
            onClick={handleSavePassword}
            disabled={savingPassword}
            className="btn btn-secondary"
          >
            {savingPassword && <span className="spinner" />}
            パスワードを変更
          </button>
        </div>
      </div>

      {/* 画像アップロードモーダル */}
      <AvatarUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={(dataUrl) => {
          setAvatarPreview(dataUrl);
          setUploadModalOpen(false);
          toast.success("プロフィール画像を変更しました");
        }}
      />
    </div>
  );
}

// ============================================================
// AvatarUploadModal
// ============================================================

function AvatarUploadModal({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (dataUrl: string) => void;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleClose() {
    if (loading) return;
    setPreview(null);
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("ファイルサイズは2MB以下にしてください");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleUpload() {
    if (!preview) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onUploaded(preview);
      setPreview(null);
    }, 1000);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="プロフィール画像を変更"
      size="sm"
      footer={
        <>
          <button onClick={handleClose} disabled={loading} className="btn btn-ghost">
            キャンセル
          </button>
          <button
            onClick={handleUpload}
            disabled={!preview || loading}
            className="btn btn-primary"
          >
            {loading && <span className="spinner" />}
            アップロード
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* プレビュー */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 overflow-hidden ring-2 ring-gray-200">
            {preview ? (
              <img
                src={preview}
                alt="プレビュー"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary-700">田</span>
            )}
          </div>
        </div>

        {/* ドロップエリア */}
        <button
          className="add-btn !flex-col mt-5"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="p-2">
            <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
          </div>
          <p className="text-sm font-medium text-gray-600">
            クリックして画像を選択
          </p>
          <p className="text-xs text-gray-400">JPG, PNG 最大2MB</p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </Modal>
  );
}

// ============================================================
// NotificationsTab
// ============================================================

function NotificationsTab() {
  const toast = useToast();
  const [emailBookingNew, setEmailBookingNew] = useState(true);
  const [emailBookingCancel, setEmailBookingCancel] = useState(true);
  const [emailReminder, setEmailReminder] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [reminderTime, setReminderTime] = useState("30");
  const [slackNotify, setSlackNotify] = useState(false);
  const [chatworkNotify, setChatworkNotify] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/user")
      .then((r) => r.json())
      .then((data) => {
        setEmailBookingNew(data.notify_booking_new ?? true);
        setEmailBookingCancel(data.notify_booking_cancel ?? true);
        setEmailReminder(data.notify_reminder ?? true);
        setEmailDigest(data.notify_digest ?? false);
      })
      .catch(() => {});
  }, []);

  const emailNotifications = [
    {
      id: "new",
      label: "新規予約通知",
      description: "候補者が面接を予約した際に通知を受け取ります",
      checked: emailBookingNew,
      onChange: setEmailBookingNew,
    },
    {
      id: "cancel",
      label: "キャンセル通知",
      description: "予約がキャンセルされた際に通知を受け取ります",
      checked: emailBookingCancel,
      onChange: setEmailBookingCancel,
    },
    {
      id: "reminder",
      label: "面接リマインダー",
      description: "面接開始前にリマインダーを受け取ります",
      checked: emailReminder,
      onChange: setEmailReminder,
    },
    {
      id: "digest",
      label: "デイリーダイジェスト",
      description: "毎朝、当日の面接スケジュールをまとめて通知します",
      checked: emailDigest,
      onChange: setEmailDigest,
    },
  ];

  const messagingNotifications = [
    {
      id: "slack",
      label: "Slack通知",
      description: "SlackチャンネルにもNotifyします（連携設定が必要）",
      checked: slackNotify,
      onChange: setSlackNotify,
    },
    {
      id: "chatwork",
      label: "Chatwork通知",
      description: "ChatworkルームにもNotifyします（連携設定が必要）",
      checked: chatworkNotify,
      onChange: setChatworkNotify,
    },
  ];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notify_booking_new: emailBookingNew,
          notify_booking_cancel: emailBookingCancel,
          notify_reminder: emailReminder,
          notify_digest: emailDigest,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("通知設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* メール通知 */}
      <div className="card">
        <h2 className="text-md font-semibold mb-4">メール通知</h2>

        <div className="space-y-3">
          {emailNotifications.map((n) => (
            <NotificationToggleRow key={n.id} {...n} />
          ))}
        </div>

        {/* Reminder Time */}
        <div className="mt-4">
          <label className="label mb-1">送信タイミング</label>
          <select
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="select max-w-xs"
          >
            <option value="15">15分前</option>
            <option value="30">30分前</option>
            <option value="60">1時間前</option>
            <option value="120">2時間前</option>
            <option value="1440">1日前</option>
          </select>
        </div>
      </div>

      {/* メッセージ通知 */}
      <div className="card">
        <h2 className="textmdm font-semibold">メッセージ通知</h2>
        <p className="text-xs text-gray-500 mb-4 mt-1">
          連携設定は「カレンダー連携」タブから設定できます
        </p>

        <div className="space-y-3">
          {messagingNotifications.map((n) => (
            <NotificationToggleRow key={n.id} {...n} />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? (
            <span className="spinner" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          保存
        </button>
      </div>
    </div>
  );
}

function NotificationToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
          checked ? "bg-primary-500" : "bg-gray-200"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform mt-0.5",
            checked ? "translate-x-5 ml-0.5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

// ============================================================
// CalendarTab
// ============================================================

type CalendarStatus = "not_connected" | "connected" | "error";

function CalendarTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [calendarStatus, setCalendarStatus] =
    useState<CalendarStatus>("not_connected");
  const [googleAccount, setGoogleAccount] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    // プロフィールからカレンダー連携状態を取得
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((data) => {
        setCalendarStatus(
          (data.calendar_status as CalendarStatus) ?? "not_connected"
        );
        setGoogleAccount(data.google_account_email ?? null);
        setLastSyncedAt(data.last_synced_at ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // OAuthコールバック後のURLパラメータを処理
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      toast.success("Google Calendar を接続しました");
      history.replaceState({}, "", window.location.pathname);
    } else if (params.get("error")) {
      const err = params.get("error");
      toast.error(
        err === "access_denied"
          ? "接続がキャンセルされました"
          : "Google Calendar の接続に失敗しました"
      );
      history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 自動同期: 接続済みの場合はマウント時に即実行 + 2分ごとにポーリング
  useEffect(() => {
    if (calendarStatus !== "connected") return;

    async function autoSync() {
      try {
        const res = await fetch("/api/calendar/sync", { method: "POST" });
        if (res.ok) setLastSyncedAt(new Date().toISOString());
      } catch {
        // サイレントに失敗（ユーザーに通知しない）
      }
    }

    autoSync();
    const id = setInterval(autoSync, 2 * 60 * 1000); // 2分ごと
    return () => clearInterval(id);
  }, [calendarStatus]);

  function handleConnect() {
    window.location.href = "/api/auth/google";
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST" });
      if (!res.ok) throw new Error();
      setLastSyncedAt(new Date().toISOString());
      toast.success("カレンダーを同期しました");
    } catch {
      toast.error("同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnectConfirm() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();
      setCalendarStatus("not_connected");
      setGoogleAccount(null);
      setLastSyncedAt(null);
      setDisconnectOpen(false);
      toast.success("Google Calendar の接続を解除しました");
    } catch {
      toast.error("接続解除に失敗しました");
    } finally {
      setDisconnecting(false);
    }
  }

  const lastSyncedText = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " に同期"
    : "未同期";

  return (
    <div className="space-y-4">
      {/* カレンダー連携 */}
      <div className="card">
        <h2 className="text-md font-semibold">カレンダー連携</h2>
        <p className="text-xs text-gray-500 mb-4 mt-1">
          カレンダーを接続して面接官の空き時間を自動取得します
        </p>

        {loading ? (
          <div className="flex justify-center py-6">
            <span className="spinner" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Google Calendar（実装済み） */}
            <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-sm font-bold text-red-600">
                G
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Google Calendar</h3>
                  {calendarStatus === "connected" && (
                    <span className="badge badge-green">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      接続済み
                    </span>
                  )}
                  {calendarStatus === "error" && (
                    <span className="badge badge-red">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      エラー
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {calendarStatus === "connected" && googleAccount
                    ? `${googleAccount} · ${lastSyncedText}`
                    : calendarStatus === "error"
                    ? "再接続が必要です"
                    : "Googleカレンダーと同期して空き時間を自動取得します"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {calendarStatus === "connected" && (
                  <>
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="btn btn-secondary btn-size-s"
                      title="今すぐ同期"
                    >
                      {syncing ? (
                        <span className="spinner" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      同期
                    </button>
                    <button
                      onClick={() => setDisconnectOpen(true)}
                      className="btn btn-ghost-danger btn-size-s"
                    >
                      接続解除
                    </button>
                  </>
                )}
                {(calendarStatus === "not_connected" ||
                  calendarStatus === "error") && (
                  <button
                    onClick={handleConnect}
                    className="btn btn-secondary btn-size-s"
                  >
                    <Link2 className="h-3 w-3" />
                    {calendarStatus === "error" ? "再接続" : "接続"}
                  </button>
                )}
              </div>
            </div>

            {/* Outlook Calendar（準備中） */}
            <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 opacity-70">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600">
                O
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Outlook Calendar</h3>
                  <span className="badge badge-gray">準備中</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Microsoft Outlookカレンダーと連携します
                </p>
              </div>
              <button disabled className="btn btn-secondary btn-size-s">
                <Link2 className="h-3 w-3" />
                接続
              </button>
            </div>

            {/* Apple Calendar（準備中） */}
            <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 opacity-70">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700">
                A
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Apple Calendar</h3>
                  <span className="badge badge-gray">準備中</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Apple iCloudカレンダーと連携します
                </p>
              </div>
              <button disabled className="btn btn-secondary btn-size-s">
                <Link2 className="h-3 w-3" />
                接続
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ツール連携 */}
      <MessagingIntegrationCard />

      {/* 接続解除確認ダイアログ */}
      <ConfirmDialog
        open={disconnectOpen}
        onClose={() => {
          if (!disconnecting) setDisconnectOpen(false);
        }}
        onConfirm={handleDisconnectConfirm}
        title="接続を解除しますか？"
        description="Google Calendar との連携を解除します。カレンダーの同期が停止され、同期済みのデータが削除されます。"
        confirmLabel="接続解除"
        confirmVariant="danger"
        loading={disconnecting}
      />
    </div>
  );
}

// ============================================================
// MessagingIntegrationCard
// ============================================================

const MESSAGING_INTEGRATIONS = [
  {
    name: "Slack",
    icon: "S",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-700",
    description: "Slackのワークスペースと連携して、予約通知を自動送信します",
    authButtonLabel: "Slackで認証",
  },
  {
    name: "Chatwork",
    icon: "C",
    iconBg: "bg-green-50",
    iconColor: "text-green-700",
    description: "Chatworkのルームと連携して、予約通知を自動送信します",
    authButtonLabel: "Chatworkで認証",
  },
] as const;

function MessagingIntegrationCard() {
  const toast = useToast();
  const [states, setStates] = useState<Record<string, MessagingIntegrationState>>({
    Slack: { connected: false, loading: false },
    Chatwork: { connected: false, loading: false },
  });
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  function handleConnect(name: string) {
    setStates((prev) => ({ ...prev, [name]: { ...prev[name], loading: true } }));
    // 実際の実装では外部の OAuth 認証画面にリダイレクトする
    setTimeout(() => {
      setStates((prev) => ({ ...prev, [name]: { connected: true, loading: false } }));
      toast.success(`${name} を接続しました`);
    }, 1500);
  }

  function handleDisconnectConfirm() {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    setTimeout(() => {
      const name = disconnectTarget;
      setStates((prev) => ({ ...prev, [name]: { connected: false, loading: false } }));
      setDisconnectTarget(null);
      setDisconnecting(false);
      toast.success(`${name} の接続を解除しました`);
    }, 1000);
  }

  return (
    <>
      <div className="card">
        <h2 className="text-md font-semibold">ツール連携</h2>
        <p className="text-xs text-gray-500 mb-4 mt-1">
          SlackやChatworkに予約通知を送信できます
        </p>

        <div className="space-y-4">
          {MESSAGING_INTEGRATIONS.map((integration) => {
            const state = states[integration.name];
            return (
              <div
                key={integration.name}
                className="rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                      integration.iconBg,
                      integration.iconColor
                    )}
                  >
                    {integration.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        {integration.name}
                      </h3>
                      {state.connected && (
                        <span className="badge badge-green">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          接続済み
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {integration.description}
                    </p>
                  </div>
                  {state.connected && (
                    <button
                      onClick={() => setDisconnectTarget(integration.name)}
                      disabled={state.loading}
                      className="btn btn-ghost-danger btn-size-s shrink-0"
                    >
                      接続解除
                    </button>
                  )}
                  {/* 未接続時: OAuth ボタン */}
                  {!state.connected && (
                    <button
                      onClick={() => handleConnect(integration.name)}
                      disabled={state.loading}
                      className="btn btn-secondary btn-size-s"
                    >
                      {state.loading ? (
                        <>
                          <span className="spinner" />
                          認証中...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-3 w-3" />
                          {integration.authButtonLabel}
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* 接続解除確認ダイアログ */}
      <ConfirmDialog
        open={disconnectTarget !== null}
        onClose={() => {
          if (!disconnecting) setDisconnectTarget(null);
        }}
        onConfirm={handleDisconnectConfirm}
        title="接続を解除しますか？"
        description={`${disconnectTarget} との連携を解除します。通知の送信が停止されます。`}
        confirmLabel="接続解除"
        confirmVariant="danger"
        loading={disconnecting}
      />
    </>
  );
}

// ============================================================
// GeneralTab
// ============================================================

function GeneralTab() {
  const toast = useToast();
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [language, setLanguage] = useState("ja");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const bookingUrl = appUrl ? `${appUrl}/j/` : "/j/";
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/user")
      .then((r) => r.json())
      .then((data) => {
        // TIME型は "HH:MM:SS" で返るので先頭5文字だけ使う
        if (data.working_hours_start)
          setWorkStart(data.working_hours_start.slice(0, 5));
        if (data.working_hours_end)
          setWorkEnd(data.working_hours_end.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          working_hours_start: workStart,
          working_hours_end: workEnd,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("一般設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Working Hours */}
      <div className="card">
        <h2 className="text-md font-semibold mb-4">営業時間</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">開始時間</label>
            <input
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label">終了時間</label>
            <input
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="input mt-1"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          この時間帯のみ面接枠が生成されます
        </p>
      </div>

      {/* Booking Link */}
      <div className="card">
        <h2 className="text-md font-semibold mb-4">予約リンク設定</h2>
        <div>
          <label className="label">ベースURL</label>
          <input
            type="url"
            value={bookingUrl}
            className="input mt-1"
            readOnly
            disabled
          />
          <p className="mt-1 text-xs text-gray-400">
            候補者に共有される予約ページのURLプレフィックスです（環境変数 NEXT_PUBLIC_APP_URL で設定）
          </p>
        </div>
      </div>

      {/* Language */}
      <div className="card">
        <h2 className="text-md font-semibold mb-4">言語・地域</h2>
        <div>
          <label className="label">表示言語</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="select mt-1 max-w-xs"
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? (
            <span className="spinner" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          保存
        </button>
      </div>
    </div>
  );
}
