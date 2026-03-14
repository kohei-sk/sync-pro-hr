import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getValidAccessToken,
  fetchCalendarEvents,
  upsertCalendarEventsToDb,
} from "@/lib/google-calendar";

/**
 * POST /api/cron/calendar-sync
 * Vercel Cron から毎時0分に呼び出される。
 * calendar_status='connected' な全ユーザーの Google Calendar を同期する。
 * CRON_SECRET ヘッダーで認証（既存のリマインダーcronと同パターン）。
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  const { data: connectedProfiles, error } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("calendar_status", "connected");

  if (error) {
    console.error("[Cron calendar-sync] Failed to fetch profiles:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const userIds = (connectedProfiles ?? []).map((p: { id: string }) => p.id);
  const results = { success: 0, failed: 0 };

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const userId of userIds) {
    try {
      const accessToken = await getValidAccessToken(serviceClient, userId);
      const events      = await fetchCalendarEvents(accessToken, timeMin, timeMax);
      await upsertCalendarEventsToDb(serviceClient, userId, events, timeMin);

      await serviceClient
        .from("profiles")
        .update({
          last_synced_at:  new Date().toISOString(),
          calendar_status: "connected",
        })
        .eq("id", userId);

      results.success++;
    } catch (err) {
      console.error(`[Cron calendar-sync] User ${userId} failed:`, err);

      // トークンエラーはユーザーに再接続を促すため "error" に設定
      await serviceClient
        .from("profiles")
        .update({ calendar_status: "error" })
        .eq("id", userId);

      results.failed++;
    }
  }

  console.log(`[Cron calendar-sync] success=${results.success}, failed=${results.failed}`);
  return NextResponse.json(results);
}
