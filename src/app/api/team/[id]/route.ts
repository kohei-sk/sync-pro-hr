import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * PATCH /api/team/[id]
 * 認証必須。チームメンバーのロールを変更する。
 * Body: { role: "admin" | "member" }
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, companyId } = await requireAuth();
    const body = await request.json();
    const { role } = body as { role: "admin" | "member" };

    if (!role || !["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "role が不正です" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", params.id)
      .eq("company_id", companyId); // RLS の代わりに company_id で確認

    if (error) {
      console.error("[Team PATCH] Error:", error);
      return serverErrorResponse("権限の変更に失敗しました");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}

/**
 * DELETE /api/team/[id]
 * 認証必須。チームメンバーを削除する（Auth ユーザーごと削除、プロフィールはカスケード）。
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, companyId } = await requireAuth();

    // 同じ会社のユーザーか確認
    const { data: profile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", params.id)
      .eq("company_id", companyId)
      .single();

    if (checkError || !profile) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    // Service role で Auth ユーザーを削除（profiles はカスケード削除される）
    const serviceClient = createServiceClient();
    const { error: deleteError } = await serviceClient.auth.admin.deleteUser(params.id);

    if (deleteError) {
      console.error("[Team DELETE] Error:", deleteError);
      return serverErrorResponse("メンバーの削除に失敗しました");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
