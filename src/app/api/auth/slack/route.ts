import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { buildSlackAuthUrl } from "@/lib/slack";

/**
 * GET /api/auth/slack
 * 認証済みユーザーを Slack OAuth 認可画面へリダイレクトする。
 * CSRF 対策: crypto.randomUUID() で state を生成し HttpOnly cookie にセット。
 * redirect_uri はリクエストの origin から動的に生成（ポート変動に対応）。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(); // ログイン済みチェックのみ

    const state       = crypto.randomUUID();
    const origin      = new URL(request.url).origin;
    // SLACK_REDIRECT_URI が設定されていればそちらを優先（Slack App設定との一致）
    const redirectUri = process.env.SLACK_REDIRECT_URI
                        ?? `${origin}/api/auth/slack/callback`;

    const cookieStore = await cookies();
    cookieStore.set("slack_oauth_state", state, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 10, // 10分
      path:     "/",
    });
    // redirect_uri をコールバックでも使えるよう cookie に保存
    cookieStore.set("slack_redirect_uri", redirectUri, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 10,
      path:     "/",
    });

    return NextResponse.redirect(buildSlackAuthUrl(state, redirectUri));
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
