"use client";

import { useRef, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";

// ============================================================
// Types
// ============================================================

type Tab = "profile" | "notifications" | "calendar" | "general";

interface CalendarIntegrationState {
  connected: boolean;
  account: string | null;
  loading: boolean;
}

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
  { id: "calendar", label: "連携設定", icon: Calendar },
  { id: "general", label: "一般設定", icon: Globe },
];

// ============================================================
// Page
// ============================================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  return (
    <div>
      <header className="header mb-6">
        <div className="header-col">
          <h1 className="header-title">設定</h1>
          <p className="header-sub-title">
            アカウントとアプリケーションの設定を管理します
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="tab mb-6">
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
  const [name, setName] = useState("田中 太郎");
  const [email, setEmail] = useState("tanaka@example.com");
  const [timezone, setTimezone] = useState("Asia/Tokyo");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  function handleSaveProfile() {
    setSavingProfile(true);
    setTimeout(() => {
      setSavingProfile(false);
      toast.success("基本情報を保存しました");
    }, 800);
  }

  function handleSavePassword() {
    setSavingPassword(true);
    setTimeout(() => {
      setSavingPassword(false);
      toast.success("パスワードを変更しました");
    }, 800);
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">基本情報</h2>
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
                <span className="text-xl font-bold text-primary-700">田</span>
              )}
            </div>
            <div>
              <button
                className="btn-secondary btn-size-s"
                onClick={() => setUploadModalOpen(true)}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                画像を変更
              </button>
              <p className="mt-1 text-xs text-gray-400">JPG, PNG 最大 2MB</p>
            </div>
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
            className="btn-primary"
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
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" />
            セキュリティ
          </div>
        </h2>
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
            className="btn-secondary"
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
      alert("ファイルサイズは2MB以下にしてください");
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
          <button onClick={handleClose} disabled={loading} className="btn-ghost">
            キャンセル
          </button>
          <button
            onClick={handleUpload}
            disabled={!preview || loading}
            className="btn-primary"
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
        <div
          className="upload-area"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-600">
            クリックして画像を選択
          </p>
          <p className="mt-1 text-xs text-gray-400">JPG, PNG 最大2MB</p>
        </div>
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

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("通知設定を保存しました");
    }, 800);
  }

  return (
    <div className="space-y-4">
      {/* メール通知 */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">メール通知</h2>

        <div className="space-y-3">
          {emailNotifications.map((n) => (
            <NotificationToggleRow key={n.id} {...n} />
          ))}
        </div>

        {/* Reminder Time */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <label className="label !mb-0">リマインダー送信タイミング</label>
          </div>
          <select
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="select mt-1 max-w-xs"
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
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">メッセージ通知</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          連携設定は「カレンダー連携」タブから設定できます
        </p>

        <div className="space-y-3">
          {messagingNotifications.map((n) => (
            <NotificationToggleRow key={n.id} {...n} />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary">
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
        <p className="text-sm font-medium text-gray-900">{label}</p>
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

const CALENDAR_INTEGRATIONS = [
  {
    name: "Google Calendar",
    description: "Googleカレンダーと同期して空き時間を自動取得します",
    icon: "G",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    defaultAccount: "tanaka@example.com",
    defaultConnected: true,
  },
  {
    name: "Outlook Calendar",
    description: "Microsoft Outlookカレンダーと連携します",
    icon: "O",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    defaultAccount: null,
    defaultConnected: false,
  },
  {
    name: "Apple Calendar",
    description: "Apple iCloudカレンダーと連携します",
    icon: "A",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-700",
    defaultAccount: null,
    defaultConnected: false,
  },
];

function CalendarTab() {
  const toast = useToast();

  // カレンダー連携状態
  const [calendarStates, setCalendarStates] = useState<
    Record<string, CalendarIntegrationState>
  >(() => {
    const initial: Record<string, CalendarIntegrationState> = {};
    for (const c of CALENDAR_INTEGRATIONS) {
      initial[c.name] = {
        connected: c.defaultConnected,
        account: c.defaultConnected ? c.defaultAccount : null,
        loading: false,
      };
    }
    return initial;
  });
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // 同期設定
  const [autoSync, setAutoSync] = useState(true);
  const [savingSyncSettings, setSavingSyncSettings] = useState(false);

  function handleConnect(name: string) {
    setCalendarStates((prev) => ({
      ...prev,
      [name]: { ...prev[name], loading: true },
    }));
    setTimeout(() => {
      setCalendarStates((prev) => ({
        ...prev,
        [name]: {
          connected: true,
          account: "tanaka@example.com",
          loading: false,
        },
      }));
      toast.success(`${name} を接続しました`);
    }, 1500);
  }

  function handleDisconnect(name: string) {
    setDisconnectTarget(name);
  }

  function handleDisconnectConfirm() {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    setTimeout(() => {
      const name = disconnectTarget;
      setCalendarStates((prev) => ({
        ...prev,
        [name]: { connected: false, account: null, loading: false },
      }));
      setDisconnectTarget(null);
      setDisconnecting(false);
      toast.success(`${name} の接続を解除しました`);
    }, 1000);
  }

  function handleSaveSyncSettings() {
    setSavingSyncSettings(true);
    setTimeout(() => {
      setSavingSyncSettings(false);
      toast.success("同期設定を保存しました");
    }, 800);
  }

  return (
    <div className="space-y-4">
      {/* カレンダー連携 */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          カレンダー連携
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          カレンダーを接続して面接官の空き時間を自動取得します
        </p>

        <div className="space-y-3">
          {CALENDAR_INTEGRATIONS.map((integration) => {
            const state = calendarStates[integration.name];
            return (
              <div
                key={integration.name}
                className="flex items-center gap-4 rounded-lg border border-gray-200 p-4"
              >
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
                    <h3 className="text-sm font-semibold text-gray-900">
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
                    {state.connected
                      ? state.account
                      : integration.description}
                  </p>
                </div>
                <button
                  onClick={() =>
                    state.connected
                      ? handleDisconnect(integration.name)
                      : handleConnect(integration.name)
                  }
                  disabled={state.loading}
                  className={cn(
                    state.connected
                      ? "btn-ghost-danger btn-size-s"
                      : "btn-secondary btn-size-s"
                  )}
                >
                  {state.loading && <span className="spinner" />}
                  {!state.loading && state.connected ? (
                    "接続解除"
                  ) : !state.loading ? (
                    <>
                      <Link2 className="h-3 w-3" />
                      接続
                    </>
                  ) : null}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* メッセージングツール連携 */}
      <MessagingIntegrationCard />

      {/* 同期設定 */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">同期設定</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">自動同期</p>
              <p className="text-xs text-gray-500 mt-0.5">
                カレンダーの変更を自動的に反映します
              </p>
            </div>
            <button
              onClick={() => setAutoSync((v) => !v)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                autoSync ? "bg-primary-500" : "bg-gray-200"
              )}
              role="switch"
              aria-checked={autoSync}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform",
                  autoSync ? "translate-x-5 ml-0.5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
          <div>
            <label className="label">同期間隔</label>
            <select className="select mt-1 max-w-xs">
              <option value="5">5分ごと</option>
              <option value="15">15分ごと</option>
              <option value="30">30分ごと</option>
              <option value="60">1時間ごと</option>
            </select>
          </div>
          <div>
            <label className="label">同期範囲</label>
            <select className="select mt-1 max-w-xs">
              <option value="7">1週間先まで</option>
              <option value="14">2週間先まで</option>
              <option value="30">1ヶ月先まで</option>
              <option value="60">2ヶ月先まで</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
          <button
            onClick={handleSaveSyncSettings}
            disabled={savingSyncSettings}
            className="btn-primary"
          >
            {savingSyncSettings ? (
              <span className="spinner" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存
          </button>
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
        description={`${disconnectTarget} との連携を解除します。カレンダーの同期が停止されます。`}
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
    authButtonLabel: "Slackで認証する",
    authHint: "Slackのブラウザ認証画面に移動します",
  },
  {
    name: "Chatwork",
    icon: "C",
    iconBg: "bg-green-50",
    iconColor: "text-green-700",
    description: "Chatworkのルームと連携して、予約通知を自動送信します",
    authButtonLabel: "Chatworkで認証する",
    authHint: "Chatworkのブラウザ認証画面に移動します",
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
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">メッセージングツール連携</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
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
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                      integration.iconBg,
                      integration.iconColor
                    )}
                  >
                    {integration.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
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
                      className="btn-ghost-danger btn-size-s shrink-0"
                    >
                      接続解除
                    </button>
                  )}
                </div>

                {/* 未接続時: OAuth ボタン */}
                {!state.connected && (
                  <div className="mt-1">
                    <p className="text-xs text-gray-400 mb-3">
                      {integration.authHint}
                    </p>
                    <button
                      onClick={() => handleConnect(integration.name)}
                      disabled={state.loading}
                      className="btn-primary btn-size-s"
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
                  </div>
                )}
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
  const [bookingUrl, setBookingUrl] = useState(
    "https://syncpro-hr.example.com/j/"
  );
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("一般設定を保存しました");
    }, 800);
  }

  return (
    <div className="space-y-4">
      {/* Working Hours */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            営業時間
          </div>
        </h2>
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
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-gray-400" />
            予約リンク設定
          </div>
        </h2>
        <div>
          <label className="label">ベースURL</label>
          <input
            type="url"
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
            className="input mt-1"
          />
          <p className="mt-1 text-xs text-gray-400">
            候補者に共有される予約ページのURLプレフィックスです
          </p>
        </div>
      </div>

      {/* Language */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" />
            言語・地域
          </div>
        </h2>
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
        <button onClick={handleSave} disabled={saving} className="btn-primary">
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
