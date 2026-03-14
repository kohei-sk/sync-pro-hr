import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  revokeToken,
  stopWebhookChannel,
  getValidAccessToken,
} from "@/lib/google-calendar";

/**
 * POST /api/calendar/disconnect
 * Google Calendar の連携を解除する。
 * - Webhook チャンネルを停止
 * - oauth_tokens から削除
 * - calendar_events の google ソースイベントを削除
 * - profiles.calendar_status を 'not_connected' に更新（webhook列もクリア）
 * - Google 側のトークンを失効（ベストエフォート）
 */
export async function POST() {
  try {
    const { user, supabase } = await requireAuth();

    // revoke 用の refresh_token と webhook チャンネル情報を事前取得
    const [tokenResult, profileResult] = await Promise.all([
      supabase
        .from("oauth_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .single(),
      supabase
        .from("profiles")
        .select("google_webhook_channel_id, google_webhook_resource_id")
        .eq("id", user.id)
        .single(),
    ]);

    const serviceClient = createServiceClient();

    // Webhook チャンネル停止に使うアクセストークンを取得（ベストエフォート）
    let accessTokenForStop: string | null = null;
    try {
      accessTokenForStop = await getValidAccessToken(serviceClient, user.id);
    } catch {
      // 取得できなくても続行
    }

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
          calendar_status:             "not_connected",
          google_account_email:        null,
          last_synced_at:              null,
          google_webhook_channel_id:   null,
          google_webhook_resource_id:  null,
          google_webhook_expiration:   null,
        })
        .eq("id", user.id),
    ]);

    // Webhook チャンネルを停止（ベストエフォート・失敗しても続行）
    const channelId  = profileResult.data?.google_webhook_channel_id;
    const resourceId = profileResult.data?.google_webhook_resource_id;
    if (accessTokenForStop && channelId && resourceId) {
      stopWebhookChannel(accessTokenForStop, channelId, resourceId);
    }

    // Google のトークンを失効（ベストエフォート）
    if (tokenResult.data?.refresh_token) {
      revokeToken(tokenResult.data.refresh_token as string);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
