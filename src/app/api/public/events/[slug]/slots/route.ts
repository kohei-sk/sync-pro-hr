import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeAvailableSlots } from "@/lib/scheduler";
import {
  getValidAccessToken,
  fetchCalendarEvents,
  upsertCalendarEventsToDb,
} from "@/lib/google-calendar";

/**
 * GET /api/public/events/[slug]/slots?start=YYYY-MM-DD&end=YYYY-MM-DD
 * 認証不要。指定期間の空き時間枠を返す。
 * サーバーサイドで計算するため、カレンダーイベントや既存予約も考慮される。
 */
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start");
    const endDate = url.searchParams.get("end");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start と end クエリパラメータが必要です" },
        { status: 400 }
      );
    }

    // 過去の日付からスロットを返さないよう、start を今日以降に補正
    const today = new Date().toISOString().split("T")[0];
    const effectiveStart = startDate < today ? today : startDate;

    // 補正後に end より後になる場合はスロットなしで返す
    if (effectiveStart > endDate) {
      return NextResponse.json({ available_slots: [] });
    }

    const supabase = createServiceClient();

    // イベント情報（ロール・メンバー・除外ルール含む）を取得
    const { data: event, error } = await supabase
      .from("event_types")
      .select(
        `
        id, title, duration, buffer_before, buffer_after,
        scheduling_mode, weekday_schedule, company_id,
        reception_settings,
        event_roles(
          id, name, required_count, priority_order,
          event_members(id, role_id, user_id)
        ),
        exclusion_rules(
          id, event_id, name, type, day_of_week, specific_date,
          start_time, end_time, recurring
        )
      `
      )
      .eq("slug", params.slug)
      .eq("status", "active")
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // booking_window_start / booking_window_end に基づいて受付期間をクランプ
    function toAbsoluteDays(value: number, unit: string): number {
      if (unit === "weeks") return value * 7;
      if (unit === "months") return value * 30;
      return value;
    }
    const reception = (event as any).reception_settings as any;
    const windowStartSetting = reception?.booking_window_start ?? { value: 3, unit: "days" };
    const windowEndSetting   = reception?.booking_window_end   ?? { value: 2, unit: "weeks" };
    const todayMs = Date.now();
    const windowStart = new Date(todayMs + toAbsoluteDays(windowStartSetting.value, windowStartSetting.unit) * 86400000)
      .toISOString().split("T")[0];
    const windowEnd = new Date(todayMs + toAbsoluteDays(windowEndSetting.value, windowEndSetting.unit) * 86400000)
      .toISOString().split("T")[0];
    const clampedStart = effectiveStart > windowStart ? effectiveStart : windowStart;
    const clampedEnd   = endDate < windowEnd ? endDate : windowEnd;
    if (clampedStart > clampedEnd) {
      return NextResponse.json({ available_slots: [] });
    }

    const roles = (event.event_roles as any[]) || [];
    const members = roles.flatMap((r) => (r.event_members as any[]) || []);

    // weekday モードは weekday_schedule からユーザーIDを取得する
    const weekdaySchedule = (event.weekday_schedule as any[]) || [];
    const userIds: string[] =
      event.scheduling_mode === "weekday"
        ? [...new Set(weekdaySchedule.flatMap((ws: any) => ws.member_ids || []))]
        : [...new Set(members.map((m: any) => m.user_id))];

    if (userIds.length === 0) {
      return NextResponse.json({ available_slots: [] });
    }

    // Google Calendar 連携済みのユーザーのカレンダーを同期（常に最新データで計算する）
    const { data: connectedUsers } = await supabase
      .from("profiles")
      .select("id")
      .in("id", userIds)
      .eq("calendar_status", "connected");

    if (connectedUsers && connectedUsers.length > 0) {
      // Google Calendar API は ISO 8601 完全形式が必要（"YYYY-MM-DD" のみは不可）
      const syncTimeMin = clampedStart + "T00:00:00.000Z";
      const syncTimeMax = clampedEnd   + "T23:59:59.999Z";

      await Promise.all(
        connectedUsers.map(async (u: { id: string }) => {
          try {
            const token  = await getValidAccessToken(supabase, u.id);
            const events = await fetchCalendarEvents(token, syncTimeMin, syncTimeMax);
            await upsertCalendarEventsToDb(supabase, u.id, events, syncTimeMin);
            await supabase
              .from("profiles")
              .update({ last_synced_at: new Date().toISOString() })
              .eq("id", u.id);
            console.log(`[Slots] Synced ${events.length} events for user ${u.id}`);
          } catch (err) {
            console.error(`[Slots] Calendar sync failed for user ${u.id}:`, err);
            // 同期失敗しても空き枠計算は続行
          }
        })
      );
    }

    // メンバーのカレンダーイベントを取得（DB の start_time/end_time → scheduler の start/end にマッピング）
    const { data: calendarEventsDB } = await supabase
      .from("calendar_events")
      .select("id, user_id, title, start_time, end_time")
      .in("user_id", userIds)
      .gte("start_time", clampedStart)
      .lte("end_time", clampedEnd + "T23:59:59Z");

    const calendarEvents = (calendarEventsDB || []).map((e: any) => ({
      id: e.id,
      user_id: e.user_id,
      title: e.title,
      start: e.start_time,
      end: e.end_time,
    }));

    // 既存の確定・保留中予約をカレンダーイベントとして扱い二重予約を防ぐ
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("id, start_time, end_time, booking_members(user_id)")
      .eq("event_id", event.id)
      .in("status", ["confirmed", "pending"]);

    const bookingBusy = (existingBookings || []).flatMap((b: any) =>
      (b.booking_members || []).map((bm: any) => ({
        id: `booking-${b.id}-${bm.user_id}`,
        user_id: bm.user_id,
        title: "予約済み",
        start: b.start_time,
        end: b.end_time,
      }))
    );

    const allBusyEvents = [...calendarEvents, ...bookingBusy];

    // スロット計算
    const result = computeAvailableSlots({
      event: event as any,
      roles: roles as any,
      members: members as any,
      exclusion_rules: (event.exclusion_rules as any[]) || [],
      calendar_events: allBusyEvents,
      date_range: { start: clampedStart, end: clampedEnd },
      working_hours: { start: "09:00", end: "18:00" },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Slots] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
