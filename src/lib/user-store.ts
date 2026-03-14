"use client";

import { useSyncExternalStore, useEffect } from "react";

// ============================================================
// 現在ユーザーの型
// ============================================================
export type CurrentUser = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  company_name: string;
  timezone: string;
  role: string;
};

// ============================================================
// モジュールレベルキャッシュ
// ============================================================
let currentUser: CurrentUser | null = null;
let fetched = false;
let epoch = 0;

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

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ============================================================
// データ取得（初回のみ）
// ============================================================
export async function ensureUserFetched(): Promise<void> {
  if (fetched) return;
  fetched = true;
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      currentUser = await res.json();
      emit();
    }
  } catch {
    fetched = false; // リトライを許可
  }
}

// プロフィール保存後にキャッシュを無効化して再取得させる
export function invalidateUser(): void {
  fetched = false;
  currentUser = null;
  emit();
  ensureUserFetched();
}

// ============================================================
// React フック
// ============================================================
export function useCurrentUser(): CurrentUser | null {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureUserFetched();
  }, []);

  return currentUser;
}
