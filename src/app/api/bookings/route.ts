import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";

/**
 * GET /api/bookings
 * 認証必須。自社の予約一覧を返す。
 * RLS により会社スコープで自動フィルタされる。
 */
export async function GET() {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id, event_id, candidate_name, candidate_email, candidate_phone,
        start_time, end_time, status, meeting_url, created_at,
        event_types(id, title, color)
      `
      )
      .order("start_time", { ascending: false });

    if (error) {
      console.error("[Bookings] Fetch error:", error);
      return serverErrorResponse();
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return unauthorizedResponse();
    return serverErrorResponse();
  }
}
