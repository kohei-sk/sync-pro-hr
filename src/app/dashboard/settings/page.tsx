"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "profile" | "notifications" | "calendar" | "general";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profile", label: "プロフィール", icon: User },
  { id: "notifications", label: "通知設定", icon: Bell },
  { id: "calendar", label: "カレンダー連携", icon: Calendar },
  { id: "general", label: "一般設定", icon: Globe },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">設定</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          アカウントとアプリケーションの設定を管理します
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl">
        {activeTab === "profile" && <ProfileTab onSave={handleSave} />}
        {activeTab === "notifications" && (
          <NotificationsTab onSave={handleSave} />
        )}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "general" && <GeneralTab onSave={handleSave} />}
      </div>

      {/* Toast */}
      {saved && (
        <div className="toast">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-gray-700">
            設定を保存しました
          </span>
        </div>
      )}
    </div>
  );
}

function ProfileTab({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState("田中 太郎");
  const [email, setEmail] = useState("tanaka@example.com");
  const [timezone, setTimezone] = useState("Asia/Tokyo");

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          基本情報
        </h2>
        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
              田
            </div>
            <div>
              <button className="btn-secondary btn-size-s">
                画像を変更
              </button>
              <p className="mt-1 text-xs text-gray-400">
                JPG, PNG 最大 2MB
              </p>
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
          <button onClick={onSave} className="btn-primary">
            <Save className="h-4 w-4" />
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
          <button onClick={onSave} className="btn-secondary">
            パスワードを変更
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ onSave }: { onSave: () => void }) {
  const [emailBookingNew, setEmailBookingNew] = useState(true);
  const [emailBookingCancel, setEmailBookingCancel] = useState(true);
  const [emailReminder, setEmailReminder] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [reminderTime, setReminderTime] = useState("30");

  const notifications = [
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

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">
        メール通知
      </h2>

      <div className="space-y-4">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{n.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{n.description}</p>
            </div>
            <button
              onClick={() => n.onChange(!n.checked)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                n.checked ? "bg-primary-500" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform mt-0.5",
                  n.checked ? "translate-x-5 ml-0.5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
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

      <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
        <button onClick={onSave} className="btn-primary">
          <Save className="h-4 w-4" />
          保存
        </button>
      </div>
    </div>
  );
}

function CalendarTab() {
  const integrations = [
    {
      name: "Google Calendar",
      description: "Googleカレンダーと同期して空き時間を自動取得します",
      icon: "G",
      iconBg: "bg-red-50",
      iconColor: "text-red-600",
      connected: true,
      account: "tanaka@example.com",
    },
    {
      name: "Outlook Calendar",
      description:
        "Microsoft Outlookカレンダーと連携します",
      icon: "O",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      connected: false,
      account: null,
    },
    {
      name: "Apple Calendar",
      description: "Apple iCloudカレンダーと連携します",
      icon: "A",
      iconBg: "bg-gray-100",
      iconColor: "text-gray-700",
      connected: false,
      account: null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          カレンダー連携
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          カレンダーを接続して面接官の空き時間を自動取得します
        </p>

        <div className="space-y-3">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-4 rounded-lg border border-gray-200 p-4"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold",
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
                  {integration.connected && (
                    <span className="badge badge-green">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      接続済み
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {integration.connected
                    ? integration.account
                    : integration.description}
                </p>
              </div>
              <button
                className={cn(
                  integration.connected
                    ? "btn-ghost-danger btn-size-s"
                    : "btn-secondary btn-size-s"
                )}
              >
                {integration.connected ? (
                  "接続解除"
                ) : (
                  <>
                    <Link2 className="h-3 w-3" />
                    接続
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Settings */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          同期設定
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                自動同期
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                カレンダーの変更を自動的に反映します
              </p>
            </div>
            <button className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full bg-primary-500 transition-colors">
              <span className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm translate-x-5 ml-0.5 mt-0.5" />
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
      </div>
    </div>
  );
}

function GeneralTab({ onSave }: { onSave: () => void }) {
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [language, setLanguage] = useState("ja");
  const [bookingUrl, setBookingUrl] = useState("https://syncpro-hr.example.com/j/");

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
        <button onClick={onSave} className="btn-primary">
          <Save className="h-4 w-4" />
          保存
        </button>
      </div>
    </div>
  );
}
