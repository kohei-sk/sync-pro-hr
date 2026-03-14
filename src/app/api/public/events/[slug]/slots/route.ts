import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeAvailableSlots } from "@/lib/scheduler";

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

    const supabase = createServiceClient();

    // イベント情報（ロール・メンバー・除外ルール含む）を取得
    const { data: event, error } = await supabase
      .from("event_types")
      .select(
        `
        id, title, duration, buffer_before, buffer_after,
        scheduling_mode, weekday_schedule, company_id,
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

    // メンバーのカレンダーイベントを取得（DB の start_time/end_time → scheduler の start/end にマッピング）
    const { data: calendarEventsDB } = await supabase
      .from("calendar_events")
      .select("id, user_id, title, start_time, end_time")
      .in("user_id", userIds)
      .gte("start_time", startDate)
      .lte("end_time", endDate + "T23:59:59Z");

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
      date_range: { start: startDate, end: endDate },
      working_hours: { start: "09:00", end: "18:00" },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Slots] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
