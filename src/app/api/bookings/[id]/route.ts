import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";

/**
 * GET /api/bookings/[id]
 * 認証必須。予約の詳細情報（イベント・アサインメンバー・リマインダー含む）を返す。
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id, event_id, candidate_name, candidate_email, candidate_phone,
        start_time, end_time, status, meeting_url, custom_field_values, created_at,
        event_types(
          id, title, color, description, scheduling_mode,
          location_type, location_detail, weekday_schedule,
          custom_fields(id, event_id, label, type, is_required, sort_order, placeholder)
        ),
        booking_members(
          id, user_id, role_id,
          profiles(id, full_name, avatar_url),
          event_roles(id, name)
        ),
        booking_reminders(
          id, channel, scheduled_at, sent_at, status
        )
      `
      )
      .eq("id", params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // custom_fields を sort_order 順に
    const eventTypes = data.event_types as any;
    if (Array.isArray(eventTypes?.custom_fields)) {
      eventTypes.custom_fields.sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return unauthorizedResponse();
    return serverErrorResponse();
  }
}

/**
 * PATCH /api/bookings/[id]
 * 認証必須。予約ステータスを更新する（主にキャンセル）。
 * Body: { status: "cancelled" }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, companyId } = await requireAuth();
    const body = await request.json();
    const { status } = body as { status: string };

    if (!status) {
      return NextResponse.json({ error: "status が必要です" }, { status: 400 });
    }

    // 更新（RLS により自社の予約のみ操作可能）
    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", params.id)
      .select(
        `
        id, event_id, candidate_name, event_types(title, company_id)
      `
      )
      .single();

    if (error || !data) {
      console.error("[Bookings] Update error:", error);
      return serverErrorResponse("予約の更新に失敗しました");
    }

    // キャンセルの場合は通知とアクティビティログを作成
    if (status === "cancelled") {
      const booking = data as any;
      const eventTitle = booking.event_types?.title || "";
      const candidateName = booking.candidate_name || "";

      // アサインされていたメンバーに通知
      const { data: assignedMembers } = await supabase
        .from("booking_members")
        .select("user_id")
        .eq("booking_id", params.id);

      if (assignedMembers && assignedMembers.length > 0) {
        await supabase.from("notifications").insert(
          assignedMembers.map((m) => ({
            company_id: companyId,
            user_id: m.user_id,
            type: "booking_cancelled",
            booking_id: params.id,
            candidate_name: candidateName,
            event_title: eventTitle,
            message: `${candidateName} さんの ${eventTitle} の予約がキャンセルされました`,
          }))
        );
      }

      await supabase.from("activity_log").insert({
        company_id: companyId,
        type: "booking_cancelled",
        description: `${candidateName} さんの ${eventTitle} の予約がキャンセルされました`,
        metadata: { booking_id: params.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return unauthorizedResponse();
    return serverErrorResponse();
  }
}
