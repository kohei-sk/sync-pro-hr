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
 *
 * 削除前に ON DELETE CASCADE が設定されていない参照先を手動でクリーンアップする:
 *   - notifications (user_id)
 *   - event_types (user_id) → 削除する管理者自身に再アサイン
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase, companyId, user } = await requireAuth();

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

    // 自分自身の削除は禁止
    if (params.id === user.id) {
      return NextResponse.json({ error: "自分自身は削除できません" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // 1. notifications を削除（CASCADE なし）
    await serviceClient
      .from("notifications")
      .delete()
      .eq("user_id", params.id);

    // 2. event_types.user_id を操作者自身に再アサイン（CASCADE なし・NOT NULL）
    await serviceClient
      .from("event_types")
      .update({ user_id: user.id })
      .eq("user_id", params.id);

    // 3. Auth ユーザーを削除（profiles は auth.users → CASCADE 削除される）
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
