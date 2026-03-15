import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/auth/verify-invite
 * 認証不要。招待トークンを検証し、新鮮な Supabase magic link を返す。
 *
 * Body: { token: string }
 * Response: { url: string } | { error: string }
 *
 * 【セキュリティ設計】
 *   - token は DB の invite_token と照合し、期限内のもののみ許可
 *   - 使用済みトークンは即座に null にして二重利用を防ぐ
 *   - magic link はこのエンドポイント呼び出し時（ユーザー操作後）に生成するため
 *     メールスキャナーによる pre-fetch で消費されることがない
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "トークンが必要です" }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

    // トークンをDBで検索（期限内のもの）
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("id, invite_token_expires_at")
      .eq("invite_token", token)
      .gte("invite_token_expires_at", new Date().toISOString())
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "招待リンクが無効または期限切れです。管理者に再招待を依頼してください。" },
        { status: 400 }
      );
    }

    // ユーザーのメールアドレスを auth.users から取得
    const { data: userData, error: userError } =
      await serviceClient.auth.admin.getUserById(profile.id);

    if (userError || !userData.user?.email) {
      console.error("[verify-invite] getUserById error:", userError);
      return NextResponse.json(
        { error: "ユーザー情報の取得に失敗しました" },
        { status: 500 }
      );
    }

    const email = userData.user.email;

    // invite_token を消費（一度だけ使用可能にする）
    await serviceClient
      .from("profiles")
      .update({ invite_token: null, invite_token_expires_at: null })
      .eq("id", profile.id);

    // その場で新鮮な magic link を生成
    // ユーザーがボタンをクリックした後に生成するため、メールスキャナーの影響なし
    //
    // ※ generateLink(type:'magiclink') は implicit flow を使う。
    //   tokens が URL ハッシュ(#) に入って返るため、サーバーサイドの
    //   /auth/callback/route.ts ではなく、クライアントサイドの
    //   /auth/magic-link/page.tsx で setSession() する。
    const { data: linkData, error: linkError } =
      await serviceClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${appUrl}/auth/magic-link?next=/auth/accept-invite`,
        },
      });

    if (linkError || !linkData.properties?.action_link) {
      console.error("[verify-invite] generateLink error:", linkError);
      return NextResponse.json(
        { error: "認証リンクの生成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: linkData.properties.action_link });
  } catch (err) {
    console.error("[verify-invite] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
