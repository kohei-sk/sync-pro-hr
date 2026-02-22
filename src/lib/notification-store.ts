import { useSyncExternalStore } from "react";
import { mockNotifications } from "@/lib/mock-data";

// Module-level set of read notification IDs
const readIds = new Set<string>(
  mockNotifications.filter((n) => n.is_read).map((n) => n.id)
);

// Subscribers for reactivity
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markAsRead(id: string): void {
  if (!readIds.has(id)) {
    readIds.add(id);
    notify();
  }
}

export function markAllAsRead(): void {
  let changed = false;
  mockNotifications.forEach((n) => {
    if (!readIds.has(n.id)) {
      readIds.add(n.id);
      changed = true;
    }
  });
  if (changed) notify();
}

export function isRead(id: string): boolean {
  return readIds.has(id);
}

function getSnapshot() {
  return readIds.size;
}

export function useNotificationStore() {
  // useSyncExternalStore triggers re-render when readIds.size changes
  useSyncExternalStore(subscribe, getSnapshot, () => 0);

  const unreadCount = mockNotifications.filter((n) => !readIds.has(n.id)).length;

  return {
    unreadCount,
    isRead,
    markAsRead,
    markAllAsRead,
  };
}
