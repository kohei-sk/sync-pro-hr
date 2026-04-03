import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/auth/verify-invite
 * 認証不要。招待トークンを検証し、Supabase の hashed_token を返す。
 *
 * Body: { token: string }
 * Response: { token_hash: string } | { error: string }
 *
 * 【セキュリティ設計】
 *   - token は DB の invite_token と照合し、期限内のもののみ許可
 *   - magic link 生成が成功した後にトークンを消費（生成失敗時はリトライ可能）
 *   - magic link はこのエンドポイント呼び出し時（ユーザー操作後）に生成するため
 *     メールスキャナーによる pre-fetch で消費されることがない
 *   - action_link 経由のリダイレクトを使わず hashed_token を返し、クライアント側で
 *     verifyOtp() を直接呼ぶことで Supabase の Redirect URLs 許可リスト制約を回避
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string };
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "トークンが必要です" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

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

    // その場で新鮮な magic link を生成（トークン消費より先に行い、失敗時はリトライ可能にする）
    // hashed_token をクライアントに返し、verifyOtp() で直接セッション確立する。
    // action_link 経由のリダイレクトを使わないため、Supabase の Redirect URLs 設定に依存しない。
    const { data: linkData, error: linkError } =
      await serviceClient.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError || !linkData.properties?.hashed_token) {
      console.error("[verify-invite] generateLink error:", linkError);
      return NextResponse.json(
        { error: "認証リンクの生成に失敗しました" },
        { status: 500 }
      );
    }

    // マジックリンク生成成功後にトークンを消費（生成失敗時はトークンが残りリトライ可能）
    await serviceClient
      .from("profiles")
      .update({ invite_token: null, invite_token_expires_at: null })
      .eq("id", profile.id);

    return NextResponse.json({ token_hash: linkData.properties.hashed_token });
  } catch (err) {
    console.error("[verify-invite] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
