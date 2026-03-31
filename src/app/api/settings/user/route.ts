import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";

/**
 * GET /api/settings/user
 * 認証必須。ユーザー設定（通知フラグ・勤務時間）を返す。
 * レコードが未作成の場合はデフォルト値を返す。
 */
export async function GET() {
  try {
    const { supabase, user } = await requireAuth();

    const { data, error } = await supabase
      .from("user_settings")
      .select(
        "working_hours_start, working_hours_end, notify_booking_new, notify_booking_cancel, slack_notify_booking_new, slack_notify_booking_cancel"
      )
      .eq("user_id", user.id)
      .single();

    // PGRST116 = no rows found → return defaults
    if (error && error.code === "PGRST116") {
      return NextResponse.json({
        working_hours_start:         "09:00",
        working_hours_end:           "18:00",
        notify_booking_new:          true,
        notify_booking_cancel:       true,
        slack_notify_booking_new:    false,
        slack_notify_booking_cancel: false,
      });
    }

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}

/**
 * PATCH /api/settings/user
 * 認証必須。通知設定・勤務時間を upsert する。
 */
export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAuth();
    const body = await request.json();

    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, ...body }, { onConflict: "user_id" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
