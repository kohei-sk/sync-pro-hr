import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";

/**
 * PATCH /api/notifications/[id]
 * 認証必須。指定した通知を既読にする。
 */
export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", params.id)
      .eq("user_id", user.id); // 自分の通知のみ操作可能

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
