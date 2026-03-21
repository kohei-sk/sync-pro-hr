import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";

/**
 * GET /api/settings/profile
 * 認証必須。プロフィール設定（氏名・タイムゾーン・会社名）を返す。
 */
export async function GET() {
  try {
    const { supabase, user, companyId } = await requireAuth();

    const [profileResult, companyResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url, timezone, role, calendar_status, google_account_email, last_synced_at, slack_status, slack_channel_name")
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

/**
 * PATCH /api/settings/profile
 * 認証必須。氏名・タイムゾーンを更新する。
 * Body: { full_name?: string; timezone?: string }
 */
export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await requireAuth();
    const body = await request.json();
    const { full_name, timezone } = body as {
      full_name?: string;
      timezone?: string;
    };

    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (timezone !== undefined) updates.timezone = timezone;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
