import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { exchangeSlackCode } from "@/lib/slack";

/**
 * GET /api/auth/slack/callback
 * Slack OAuth コールバック。
 * CSRF検証 → コード交換 → DB保存 → /settings?tab=calendar へリダイレクト
 * redirect_uri は開始時に cookie に保存した値を使う（ポート変動に対応）。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code       = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const origin           = new URL(request.url).origin;
  const settingsCalendar = `${origin}/settings?tab=calendar`;

  // ユーザーがキャンセルした場合
  if (errorParam) {
    return NextResponse.redirect(`${settingsCalendar}&slack_error=access_denied`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${settingsCalendar}&slack_error=connect_failed`);
  }

  // CSRF: state cookie との照合
  const cookieStore   = await cookies();
  const stateCookie   = cookieStore.get("slack_oauth_state")?.value;
  const redirectUri   = process.env.SLACK_REDIRECT_URI
                        ?? cookieStore.get("slack_redirect_uri")?.value
                        ?? `${origin}/api/auth/slack/callback`;
  cookieStore.delete("slack_oauth_state");
  cookieStore.delete("slack_redirect_uri");

  if (!stateCookie || stateCookie !== stateParam) {
    return NextResponse.redirect(`${settingsCalendar}&slack_error=connect_failed`);
  }

  try {
    const { user } = await requireAuth();

    // 認可コードを Webhook URL に交換
    const { webhookUrl, channelName } = await exchangeSlackCode(code, redirectUri);

    const serviceClient = createServiceClient();

    // profiles を更新
    await serviceClient
      .from("profiles")
      .update({
        slack_status:       "connected",
        slack_webhook_url:  webhookUrl,
        slack_channel_name: channelName,
      })
      .eq("id", user.id);

    return NextResponse.redirect(`${settingsCalendar}&slack_connected=true`);
  } catch (err) {
    console.error("[Slack OAuth callback] Error:", err);
    return NextResponse.redirect(`${settingsCalendar}&slack_error=connect_failed`);
  }
}
