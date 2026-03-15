import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

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

    // Supabase Auth の招待メールを送信
    // 招待リンクをクリック → /auth/callback でセッション交換 → /auth/accept-invite でパスワード設定
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/accept-invite`;
    const { data: inviteData, error: inviteError } =
      await serviceClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          company_id: companyId,
          role,
          full_name: email.split("@")[0],
        },
      });

    if (inviteError) {
      console.error("[Team invite] Error:", inviteError);
      const msg = inviteError.message.includes("already registered")
        ? "このメールアドレスは既に登録されています"
        : "招待の送信に失敗しました";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 招待後、プロフィールを invited ステータスに更新
    if (inviteData?.user?.id) {
      await serviceClient
        .from("profiles")
        .update({ status: "invited", role, company_id: companyId })
        .eq("id", inviteData.user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
