import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getValidAccessToken,
  fetchCalendarEvents,
  upsertCalendarEventsToDb,
  registerWebhookChannel,
  stopWebhookChannel,
} from "@/lib/google-calendar";

/**
 * POST /api/cron/calendar-sync
 * Vercel Cron から5分ごとに呼び出される。
 *
 * 役割:
 *   1. Webhook が機能しない環境（localhost等）向けの fallback sync
 *   2. 期限が25時間以内の Webhook チャンネルを自動更新（チャンネルは最大7日で失効）
 *
 * CRON_SECRET ヘッダーで認証。
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // calendar_status='connected' な全ユーザーを取得（webhook情報も含む）
  const { data: connectedProfiles, error } = await serviceClient
    .from("profiles")
    .select(
      "id, google_webhook_channel_id, google_webhook_resource_id, google_webhook_expiration"
    )
    .eq("calendar_status", "connected");

  if (error) {
    console.error("[Cron calendar-sync] Failed to fetch profiles:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  type ProfileRow = {
    id: string;
    google_webhook_channel_id:  string | null;
    google_webhook_resource_id: string | null;
    google_webhook_expiration:  string | null;
  };

  const profiles = (connectedProfiles ?? []) as ProfileRow[];
  const results  = { synced: 0, failed: 0, renewed: 0 };

  const timeMin          = new Date().toISOString();
  const timeMax          = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const renewThreshold   = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
  const webhookUrl       = `${appUrl}/api/calendar/webhook`;
  const isHttps          = appUrl.startsWith("https://");

  for (const profile of profiles) {
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(serviceClient, profile.id);
    } catch (err) {
      console.error(`[Cron calendar-sync] Token error for user ${profile.id}:`, err);
      await serviceClient
        .from("profiles")
        .update({ calendar_status: "error" })
        .eq("id", profile.id);
      results.failed++;
      continue;
    }

    // ---- 1. カレンダー同期（Webhook の fallback） ----
    try {
      const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);
      await upsertCalendarEventsToDb(serviceClient, profile.id, events, timeMin);
      await serviceClient
        .from("profiles")
        .update({ last_synced_at: new Date().toISOString(), calendar_status: "connected" })
        .eq("id", profile.id);
      results.synced++;
    } catch (err) {
      console.error(`[Cron calendar-sync] Sync failed for user ${profile.id}:`, err);
      await serviceClient
        .from("profiles")
        .update({ calendar_status: "error" })
        .eq("id", profile.id);
      results.failed++;
      continue; // チャンネル更新もスキップ
    }

    // ---- 2. Webhook チャンネル更新（期限が25時間以内 & HTTPS 環境のみ） ----
    const shouldRenew =
      isHttps &&
      profile.google_webhook_expiration !== null &&
      profile.google_webhook_expiration < renewThreshold;

    if (shouldRenew) {
      try {
        // 旧チャンネルを停止
        if (profile.google_webhook_channel_id && profile.google_webhook_resource_id) {
          await stopWebhookChannel(
            accessToken,
            profile.google_webhook_channel_id,
            profile.google_webhook_resource_id
          );
        }
        // 新チャンネルを登録
        const channel = await registerWebhookChannel(
          accessToken,
          profile.id,
          webhookUrl
        );
        await serviceClient
          .from("profiles")
          .update({
            google_webhook_channel_id:  channel.channelId,
            google_webhook_resource_id: channel.resourceId,
            google_webhook_expiration:  channel.expiration,
          })
          .eq("id", profile.id);
        results.renewed++;
        console.log(`[Cron calendar-sync] Webhook channel renewed for user ${profile.id}`);
      } catch (err) {
        console.error(
          `[Cron calendar-sync] Webhook renewal failed for user ${profile.id}:`,
          err
        );
      }
    }
  }

  console.log(
    `[Cron calendar-sync] synced=${results.synced}, failed=${results.failed}, renewed=${results.renewed}`
  );
  return NextResponse.json(results);
}
