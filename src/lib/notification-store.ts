"use client";

import { useSyncExternalStore, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationType } from "@/types";

// ============================================================
// 通知の型（API レスポンス形式）
// ============================================================
export type NotificationItem = {
  id: string;
  user_id: string; // クライアント側フィルタに使用
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

/**
 * 通知キャッシュを無効化して即座に再フェッチ。
 * キャンセル等の操作後にリアルタイム未受信でも通知を即表示するために使用。
 */
export function invalidateNotifications(): void {
  fetched = false;
  ensureFetched();
}

// ============================================================
// Supabase Realtime サブスクリプション
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let realtimeChannel: any = null;
let currentUserId: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

function setupChannel(userId: string): void {
  const supabase = createClient();
  realtimeChannel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      // filter を使わず RLS に任せ、クライアント側で user_id を確認する。
      // filter: user_id=eq.${userId} は REPLICA IDENTITY FULL がないと
      // イベントを一切受信しないサイレント失敗になるため除外。
      { event: "INSERT", schema: "public", table: "notifications" },
      (payload: { new: NotificationItem }) => {
        console.log("[Notification Realtime] INSERT received. payload.new.user_id:", payload.new.user_id, "/ expected userId:", userId, "/ match:", payload.new.user_id === userId);
        if (payload.new.user_id !== userId) return;
        notifications = [payload.new, ...notifications];
        emit();
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "notifications" },
      (payload: { new: NotificationItem }) => {
        if (payload.new.user_id !== userId) return;
        notifications = notifications.map((n) =>
          n.id === payload.new.id ? payload.new : n
        );
        emit();
      }
    )
    .subscribe((status: string) => {
      console.log("[Notification Realtime] status:", status);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        realtimeChannel = null;
        if (currentUserId && !reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (currentUserId) setupChannel(currentUserId);
          }, 3000);
        }
      }
    });
}

function startPolling(): void {
  if (pollIntervalId) return;
  pollIntervalId = setInterval(() => {
    invalidateNotifications();
  }, 30_000);
}

function stopPolling(): void {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

export function initRealtime(userId: string): void {
  currentUserId = userId;
  if (realtimeChannel) return;
  setupChannel(userId);
  startPolling();
}

export function stopRealtime(): void {
  currentUserId = null;
  stopPolling();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  realtimeChannel?.unsubscribe();
  realtimeChannel = null;
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
