"use client";

import { useSyncExternalStore, useEffect } from "react";
import type { NotificationType } from "@/types";

// ============================================================
// 通知の型（API レスポンス形式）
// ============================================================
export type NotificationItem = {
  id: string;
  type: NotificationType;
  booking_id: string;
  candidate_name: string;
  event_title: string;
  message: string;
  is_read: boolean;
  created_at: string; // DB は created_at で返す（timestamp の代わり）
};

// ============================================================
// モジュールレベルのキャッシュ（ページをまたいで共有）
// ============================================================
let notifications: NotificationItem[] = [];
let fetched = false;
let initialized = false; // fetch完了後にtrue（ローディング判定用）
let epoch = 0; // 変更検知用のカウンター

const listeners = new Set<() => void>();

function emit() {
  epoch++;
  listeners.forEach((l) => l());
}

function getSnapshot(): number {
  return epoch;
}

function getServerSnapshot(): number {
  return 0;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ============================================================
// データ取得（初回のみ API コール）
// ============================================================
export async function ensureFetched(): Promise<void> {
  if (fetched) return;
  fetched = true;
  try {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      notifications = Array.isArray(data) ? data : [];
    }
  } catch {
    fetched = false; // リトライを許可
  } finally {
    initialized = true;
    emit();
  }
}

// ============================================================
// アクション（楽観的更新 + API コール）
// ============================================================
export async function markAsRead(id: string): Promise<void> {
  notifications = notifications.map((n) =>
    n.id === id ? { ...n, is_read: true } : n
  );
  emit();
  await fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
}

/**
 * 画面遷移時専用: 状態を更新するが emit() しない（再レンダーなし）。
 * カードが消えてから遷移するのを防ぐ。
 */
export function markAsReadSilent(id: string): void {
  notifications = notifications.map((n) =>
    n.id === id ? { ...n, is_read: true } : n
  );
  // emit しない → React の再レンダーが起きないのでカードが消えない
  fetch(`/api/notifications/${id}`, { method: "PATCH" }).catch(() => {});
}

export async function markAllAsRead(): Promise<void> {
  notifications = notifications.map((n) => ({ ...n, is_read: true }));
  emit();
  await fetch("/api/notifications", { method: "PATCH" }).catch(() => {});
}

export function isRead(id: string): boolean {
  return notifications.find((n) => n.id === id)?.is_read ?? false;
}

// ============================================================
// React フック
// ============================================================
export function useNotificationStore() {
  // epoch が変わるたびに再レンダー
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // マウント時にデータを取得
  useEffect(() => {
    ensureFetched();
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading: !initialized,
    isRead,
    markAsRead,
    markAllAsRead,
  };
}
