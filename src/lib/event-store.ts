import { useState, useEffect, useCallback } from "react";
import type { EventType } from "@/types";

export function useEventTypes() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("イベントの取得に失敗しました");
      const data = await res.json();
      setEventTypes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { eventTypes, loading, error, refetch };
}

export async function deleteEventTypeApi(id: string): Promise<void> {
  const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("削除に失敗しました");
}

export async function updateEventTypeApi(
  id: string,
  data: Record<string, unknown>
): Promise<EventType> {
  const res = await fetch(`/api/events/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "更新に失敗しました");
  }
  return res.json();
}

export async function createEventTypeApi(
  data: Record<string, unknown>
): Promise<EventType> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "作成に失敗しました");
  }
  return res.json();
}
