import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";

/**
 * GET /api/notifications
 * 認証必須。現在のユーザーの通知一覧を返す（最新50件）。
 */
export async function GET() {
  try {
    const { supabase, user } = await requireAuth();

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, booking_id, candidate_name, event_title, message, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}

/**
 * PATCH /api/notifications
 * 認証必須。現在のユーザーの全通知を既読にする。
 */
export async function PATCH() {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
