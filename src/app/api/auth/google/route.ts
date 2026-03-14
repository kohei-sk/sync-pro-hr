import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { buildAuthUrl } from "@/lib/google-calendar";

/**
 * GET /api/auth/google
 * 認証済みユーザーを Google OAuth 認可画面へリダイレクトする。
 * CSRF 対策: crypto.randomUUID() で state を生成し HttpOnly cookie にセット。
 */
export async function GET() {
  try {
    await requireAuth(); // ログイン済みチェックのみ

    const state = crypto.randomUUID();

    const cookieStore = await cookies();
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 10, // 10分
      path:     "/",
    });

    return NextResponse.redirect(buildAuthUrl(state));
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
