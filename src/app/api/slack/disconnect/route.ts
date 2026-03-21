import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, serverErrorResponse } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/slack/disconnect
 * 認証必須。Slack 連携を解除する。
 */
export async function POST() {
  try {
    const { user } = await requireAuth();

    const serviceClient = createServiceClient();

    await serviceClient
      .from("profiles")
      .update({
        slack_status:       "not_connected",
        slack_webhook_url:  null,
        slack_channel_name: null,
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
