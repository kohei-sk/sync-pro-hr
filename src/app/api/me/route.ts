import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";

/**
 * GET /api/me
 * 認証必須。現在のユーザーのプロフィール＋会社名を返す。
 * サイドバー・設定ページで利用。
 */
export async function GET() {
  try {
    const { supabase, user, companyId } = await requireAuth();

    const [profileResult, companyResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, timezone, role")
        .eq("id", user.id)
        .single(),
      supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single(),
    ]);

    if (profileResult.error) throw profileResult.error;

    return NextResponse.json({
      ...profileResult.data,
      email: user.email ?? "",
      company_name: companyResult.data?.name ?? "",
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
