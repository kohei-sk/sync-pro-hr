import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getValidAccessToken,
  fetchCalendarEvents,
  upsertCalendarEventsToDb,
} from "@/lib/google-calendar";

/**
 * POST /api/calendar/webhook
 * Google Calendar のプッシュ通知を受け取り、対象ユーザーのカレンダーを即座に同期する。
 *
 * Google が送るヘッダー:
 *   X-Goog-Channel-Id     → 登録時に生成した channelId
 *   X-Goog-Channel-Token  → 登録時にセットした userId
 *   X-Goog-Resource-State → "sync"（登録確認）| "exists"（変更あり）| "not_exists"（削除）
 *
 * セキュリティ: X-Goog-Channel-Id を DB の google_webhook_channel_id と照合して検証。
 */
export async function POST(request: NextRequest) {
  const userId        = request.headers.get("x-goog-channel-token");
  const channelId     = request.headers.get("x-goog-channel-id");
  const resourceState = request.headers.get("x-goog-resource-state");

  // "sync" は登録直後のテスト通知。実際のイベント変更ではないので無視。
  if (resourceState === "sync") {
    return NextResponse.json({ ok: true });
  }

  if (!userId || !channelId) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // 登録済みチャンネル ID と照合してリクエストの正当性を確認
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("google_webhook_channel_id, calendar_status")
    .eq("id", userId)
    .single();

  if (
    !profile ||
    profile.calendar_status !== "connected" ||
    profile.google_webhook_channel_id !== channelId
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // カレンダーを即時同期（60日分）
  try {
    const accessToken = await getValidAccessToken(serviceClient, userId);
    const timeMin = new Date().toISOString();
    const timeMax = new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000
    ).toISOString();

    const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);
    await upsertCalendarEventsToDb(serviceClient, userId, events, timeMin);

    await serviceClient
      .from("profiles")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", userId);

    console.log(`[Webhook] Synced calendar for user ${userId}`);
  } catch (err) {
    console.error("[Webhook] Sync failed for user", userId, err);
    // 同期失敗でも 200 を返す（Google のリトライを防ぐ）
  }

  return NextResponse.json({ ok: true });
}
