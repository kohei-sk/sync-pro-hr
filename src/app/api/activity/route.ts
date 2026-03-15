import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";

/**
 * GET /api/activity
 * 認証必須。会社のアクティビティログを返す（最新50件）。
 */
export async function GET() {
  try {
    const { supabase, companyId } = await requireAuth();

    const { data, error } = await supabase
      .from("activity_log")
      .select("id, type, description, metadata, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
