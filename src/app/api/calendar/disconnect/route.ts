import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { revokeToken } from "@/lib/google-calendar";

/**
 * POST /api/calendar/disconnect
 * Google Calendar の連携を解除する。
 * - oauth_tokens から削除
 * - calendar_events の google ソースイベントを削除
 * - profiles.calendar_status を 'not_connected' に更新
 * - Google 側のトークンを失効（ベストエフォート）
 */
export async function POST() {
  try {
    const { user, supabase } = await requireAuth();

    // revoke 用に refresh_token を先に取得
    const { data: tokenRow } = await supabase
      .from("oauth_tokens")
      .select("refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    const serviceClient = createServiceClient();

    // 並列でクリーンアップ
    await Promise.all([
      serviceClient
        .from("oauth_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", "google"),
      serviceClient
        .from("calendar_events")
        .delete()
        .eq("user_id", user.id)
        .eq("source", "google"),
      serviceClient
        .from("profiles")
        .update({
          calendar_status:      "not_connected",
          google_account_email: null,
          last_synced_at:       null,
        })
        .eq("id", user.id),
    ]);

    // Google のトークンを失効（ベストエフォート・失敗しても続行）
    if (tokenRow?.refresh_token) {
      revokeToken(tokenRow.refresh_token as string);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
