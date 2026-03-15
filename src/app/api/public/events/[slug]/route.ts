import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/public/events/[slug]
 * 認証不要。候補者向け予約ページがイベント情報を取得するために使用。
 * status = 'active' のイベントのみ返す。
 */
export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createServiceClient();

    const { data: event, error } = await supabase
      .from("event_types")
      .select(
        `
        id, title, slug, description, duration, buffer_before, buffer_after,
        location_type, location_detail, scheduling_mode, color,
        reception_settings, weekday_schedule,
        companies(name),
        event_roles(
          id, name, required_count, priority_order,
          event_members(id, role_id, user_id)
        ),
        exclusion_rules(
          id, event_id, name, type, day_of_week, specific_date,
          start_time, end_time, recurring
        ),
        custom_fields(
          id, event_id, label, type, is_required, sort_order, placeholder
        )
      `
      )
      .eq("slug", params.slug)
      .eq("status", "active")
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // custom_fields を sort_order 順に並べる
    if (Array.isArray(event.custom_fields)) {
      event.custom_fields.sort((a: any, b: any) => a.sort_order - b.sort_order);
    }

    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
