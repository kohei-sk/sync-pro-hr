import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  exchangeCodeForTokens,
  getUserEmail,
  fetchCalendarEvents,
  upsertCalendarEventsToDb,
} from "@/lib/google-calendar";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const SETTINGS_CALENDAR = `${APP_URL}/settings?tab=calendar`;

/**
 * GET /api/auth/google/callback
 * Google OAuth コールバック。
 * CSRF検証 → トークン交換 → DB保存 → 初回同期 → /settings?tab=calendar へリダイレクト
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code             = searchParams.get("code");
  const stateParam       = searchParams.get("state");
  const errorParam       = searchParams.get("error");

  // Google がエラーを返した場合（ユーザーがキャンセルなど）
  if (errorParam) {
    return NextResponse.redirect(`${SETTINGS_CALENDAR}&error=calendar_connect_cancelled`);
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${SETTINGS_CALENDAR}&error=calendar_connect_failed`);
  }

  // CSRF: state cookie との照合
  const cookieStore = await cookies();
  const stateCookie  = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state"); // 使い捨て

  if (!stateCookie || stateCookie !== stateParam) {
    return NextResponse.redirect(`${SETTINGS_CALENDAR}&error=calendar_connect_failed`);
  }

  try {
    const { user } = await requireAuth();

    // 認可コードをトークンに交換
    const tokens    = await exchangeCodeForTokens(code);
    const userEmail = await getUserEmail(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const serviceClient = createServiceClient();

    // oauth_tokens を upsert
    await serviceClient.from("oauth_tokens").upsert(
      {
        user_id:       user.id,
        provider:      "google",
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type:    tokens.token_type,
        expires_at:    expiresAt.toISOString(),
        scope:         tokens.scope,
      },
      { onConflict: "user_id,provider" }
    );

    // profiles を更新
    await serviceClient
      .from("profiles")
      .update({
        calendar_status:      "connected",
        google_account_email: userEmail,
      })
      .eq("id", user.id);

    // 初回同期（30日分）を fire-and-forget で実行
    doInitialSync(serviceClient, user.id).catch((e) =>
      console.error("[Google callback] Initial sync failed:", e)
    );

    return NextResponse.redirect(`${SETTINGS_CALENDAR}&connected=true`);
  } catch (err) {
    console.error("[Google OAuth callback] Error:", err);
    return NextResponse.redirect(`${SETTINGS_CALENDAR}&error=calendar_connect_failed`);
  }
}

async function doInitialSync(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  userId: string
): Promise<void> {
  const { getValidAccessToken } = await import("@/lib/google-calendar");
  const accessToken = await getValidAccessToken(serviceClient, userId);

  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const events = await fetchCalendarEvents(accessToken, timeMin, timeMax);
  await upsertCalendarEventsToDb(serviceClient, userId, events, timeMin);

  await serviceClient
    .from("profiles")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", userId);
}
