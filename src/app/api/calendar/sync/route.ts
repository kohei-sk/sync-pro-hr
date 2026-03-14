import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getValidAccessToken,
  fetchCalendarEvents,
  upsertCalendarEventsToDb,
} from "@/lib/google-calendar";

/**
 * POST /api/calendar/sync
 * 認証済みユーザーの Google Calendar を手動で同期する（60日分）。
 * CalendarTab の「今すぐ同期」ボタンから呼び出す。
 */
export async function POST() {
  try {
    const { user, supabase } = await requireAuth();

    // Google が接続されているか確認
    const { data: profile } = await supabase
      .from("profiles")
      .select("calendar_status")
      .eq("id", user.id)
      .single();

    if (profile?.calendar_status !== "connected") {
      return NextResponse.json(
        { error: "Google Calendar が未接続です" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const accessToken   = await getValidAccessToken(serviceClient, user.id);

    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);
    await upsertCalendarEventsToDb(serviceClient, user.id, events, timeMin);

    await serviceClient
      .from("profiles")
      .update({
        last_synced_at:  new Date().toISOString(),
        calendar_status: "connected",
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true, synced_count: events.length });
  } catch (err) {
    console.error("[Calendar sync] Error:", err);
    // トークンエラーは calendar_status を error に更新
    if (err instanceof Error && err.message.includes("token")) {
      try {
        const { user } = await requireAuth();
        createServiceClient()
          .from("profiles")
          .update({ calendar_status: "error" })
          .eq("id", user.id)
          .then(() => {});
      } catch {
        // ignore
      }
    }
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse("同期に失敗しました");
  }
}
