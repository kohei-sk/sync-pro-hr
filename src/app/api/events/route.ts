import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";

export async function GET() {
  try {
    const { supabase, companyId } = await requireAuth();

    const { data, error } = await supabase
      .from("event_types")
      .select(
        `
        *,
        event_roles (
          *,
          event_members (
            *,
            profiles (id, full_name, avatar_url)
          )
        ),
        exclusion_rules (*),
        custom_fields (*),
        reminder_settings (*)
      `
      )
      .eq("company_id", companyId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, companyId } = await requireAuth();
    const body = await request.json();

    const {
      title,
      slug,
      description,
      duration = 60,
      buffer_before = 0,
      buffer_after = 0,
      location_type = "online",
      location_detail,
      scheduling_mode = "fixed",
      color = "#3B82F6",
      status = "draft",
      reception_settings,
      weekday_schedule,
      roles = [],
      exclusion_rules = [],
      custom_fields = [],
      reminder_settings = [],
    } = body;

    if (!title || !slug) {
      return NextResponse.json(
        { error: "title と slug は必須です" },
        { status: 400 }
      );
    }

    // イベント作成
    const { data: event, error: eventError } = await supabase
      .from("event_types")
      .insert({
        company_id: companyId,
        user_id: user.id,
        title,
        slug,
        description,
        duration,
        buffer_before,
        buffer_after,
        location_type,
        location_detail,
        scheduling_mode,
        color,
        status,
        reception_settings,
        weekday_schedule,
      })
      .select()
      .single();

    if (eventError) {
      if (eventError.code === "23505") {
        return NextResponse.json(
          { error: "このスラッグは既に使用されています" },
          { status: 409 }
        );
      }
      throw eventError;
    }

    // ロール + メンバーの作成
    for (const role of roles) {
      const { data: createdRole, error: roleError } = await supabase
        .from("event_roles")
        .insert({
          event_id: event.id,
          name: role.name,
          required_count: role.required_count ?? 1,
          priority_order: role.priority_order ?? 1,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      if (role.member_ids?.length) {
        const members = role.member_ids.map((userId: string) => ({
          role_id: createdRole.id,
          user_id: userId,
        }));
        const { error: memberError } = await supabase
          .from("event_members")
          .insert(members);
        if (memberError) throw memberError;
      }
    }

    // 除外ルールの作成
    if (exclusion_rules.length) {
      const rules = exclusion_rules.map(
        (rule: Record<string, unknown>) => ({
          ...rule,
          event_id: event.id,
        })
      );
      const { error: ruleError } = await supabase
        .from("exclusion_rules")
        .insert(rules);
      if (ruleError) throw ruleError;
    }

    // カスタムフィールドの作成
    if (custom_fields.length) {
      const fields = custom_fields.map(
        (field: Record<string, unknown>, idx: number) => ({
          ...field,
          event_id: event.id,
          sort_order: field.sort_order ?? idx,
        })
      );
      const { error: fieldError } = await supabase
        .from("custom_fields")
        .insert(fields);
      if (fieldError) throw fieldError;
    }

    // リマインダー設定の作成
    if (reminder_settings.length) {
      const reminders = reminder_settings.map(
        (r: Record<string, unknown>) => ({
          ...r,
          event_id: event.id,
        })
      );
      const { error: reminderError } = await supabase
        .from("reminder_settings")
        .insert(reminders);
      if (reminderError) throw reminderError;
    }

    // アクティビティログ
    await supabase.from("activity_log").insert({
      company_id: companyId,
      type: "event_created",
      description: `イベント「${title}」が作成されました`,
      metadata: { event_id: event.id },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    console.error(err);
    return serverErrorResponse();
  }
}
