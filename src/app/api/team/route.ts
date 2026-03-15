import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sendInviteEmail } from "@/lib/email";

/**
 * GET /api/team
 * 認証必須。同じ会社のプロフィール一覧を返す（invited 含む）。
 */
export async function GET() {
  try {
    const { supabase, companyId } = await requireAuth();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, status, calendar_status, last_synced_at")
      .eq("company_id", companyId)
      .order("full_name");

    if (error) throw error;

    // auth.users からメールアドレスを取得して結合（profiles に email カラムなし）
    const profiles = data ?? [];
    const serviceClient = createServiceClient();
    const { data: usersData } = await serviceClient.auth.admin.listUsers();
    const emailMap = new Map(
      (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""])
    );
    const result = profiles.map((p: any) => ({
      ...p,
      email: emailMap.get(p.id) ?? "",
    }));

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}

/**
 * POST /api/team
 * 認証必須。メールアドレスを指定してチームメンバーを招待する。
 * Body: { email: string; role?: "admin" | "member" }
 *
 * 【フロー】
 *   1. generateLink(type:'invite') でユーザー作成（Supabase のメールは送らない）
 *   2. 独自の invite_token (UUID) を profiles に保存（7日間有効）
 *   3. Resend で招待メールを送信（リンク先: /auth/invite?token=TOKEN）
 *   4. ユーザーがリンクを開く → /auth/invite ページでボタンをクリック
 *   5. /api/auth/verify-invite でトークン検証 → 新鮮な magic link を生成
 *   6. magic link → /auth/callback → セッション確立 → /auth/accept-invite でパスワード設定
 *
 *  ※ Supabase の OTP をメール本文に直接含めない理由:
 *     メールセキュリティスキャナーが自動でリンクを開くと OTP が消費され
 *     実際のユーザーが開く頃には otp_expired になるため。
 */
export async function POST(request: Request) {
  try {
    const { companyId } = await requireAuth();
    const body = await request.json();
    const { email, role = "member" } = body as { email: string; role?: string };

    if (!email) {
      return NextResponse.json({ error: "email が必要です" }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

    // generateLink でユーザー作成（メール送信なし）
    const { data: linkData, error: linkError } =
      await serviceClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { company_id: companyId, role, full_name: email.split("@")[0] },
          redirectTo: `${appUrl}/auth/callback?next=/auth/accept-invite`,
        },
      });

    if (linkError) {
      console.error("[Team invite] generateLink error:", linkError);
      const msg =
        linkError.message.includes("already registered") ||
        linkError.message.includes("User already registered")
          ? "このメールアドレスは既に登録されています"
          : "招待の作成に失敗しました";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = linkData.user.id;

    // 独自の招待トークンを生成（7日間有効）
    const inviteToken = crypto.randomUUID();
    const inviteExpires = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // プロフィールを invited ステータスに更新・invite_token を保存
    await serviceClient
      .from("profiles")
      .update({
        status: "invited",
        role,
        company_id: companyId,
        invite_token: inviteToken,
        invite_token_expires_at: inviteExpires,
      })
      .eq("id", userId);

    // 招待メールを Resend 経由で送信
    await sendInviteEmail({ to: email, inviteToken, appUrl });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
