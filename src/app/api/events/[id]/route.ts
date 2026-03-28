import { NextResponse } from "next/server";
import {
  requireAuth,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
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
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (error) {
      if (error.code === "PGRST116")
        return NextResponse.json({ error: "Not Found" }, { status: 404 });
      throw error;
    }

    // custom_fields を sort_order 順に並べる
    const result = data as any;
    if (Array.isArray(result?.custom_fields)) {
      result.custom_fields.sort((a: any, b: any) => a.sort_order - b.sort_order);
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, companyId } = await requireAuth();
    const body = await request.json();

    // 権限チェック：自社のイベントのみ更新可能
    const { data: existing } = await supabase
      .from("event_types")
      .select("id")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (!existing)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    // RLS をバイパスするためサービスクライアントを使用（認証チェックは上記で完了済み）
    const svc = createServiceClient();

    const {
      roles,
      exclusion_rules,
      custom_fields,
      reminder_settings,
      slug: _slug, // スラッグは変更不可
      ...eventFields
    } = body;

    // イベント本体の更新（eventFields が空の場合はスキップして既存レコードを取得）
    let updated: Record<string, unknown>;
    if (Object.keys(eventFields).length > 0) {
      const { data, error: updateError } = await svc
        .from("event_types")
        .update(eventFields)
        .eq("id", id)
        .select()
        .single();
      if (updateError) throw updateError;
      updated = data as Record<string, unknown>;
    } else {
      const { data, error: fetchError } = await svc
        .from("event_types")
        .select()
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;
      updated = data as Record<string, unknown>;
    }

    // ロール・メンバーの全置換
    if (roles !== undefined) {
      const { error: roleDeleteError } = await svc.from("event_roles").delete().eq("event_id", id);
      if (roleDeleteError) throw roleDeleteError;

      for (const role of roles) {
        const { data: createdRole, error: roleError } = await svc
          .from("event_roles")
          .insert({
            event_id: id,
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
          await svc.from("event_members").insert(members);
        }
      }
    }

    // 除外ルールの全置換
    if (exclusion_rules !== undefined) {
      const { error: exDelErr } = await svc.from("exclusion_rules").delete().eq("event_id", id);
      if (exDelErr) throw exDelErr;
      if (exclusion_rules.length) {
        const { error: exInsErr } = await svc
          .from("exclusion_rules")
          .insert(exclusion_rules.map((r: Record<string, unknown>) => {
            const { id: _rid, event_id: _eid, ...rest } = r as any;
            return { ...rest, event_id: id };
          }));
        if (exInsErr) throw exInsErr;
      }
    }

    // カスタムフィールドの全置換
    if (custom_fields !== undefined) {
      const { error: cfDelErr } = await svc.from("custom_fields").delete().eq("event_id", id);
      if (cfDelErr) throw cfDelErr;
      if (custom_fields.length) {
        const { error: cfInsErr } = await svc
          .from("custom_fields")
          .insert(
            custom_fields.map((f: Record<string, unknown>, idx: number) => ({
              event_id: id,
              label: f.label,
              type: f.type,
              is_required: f.is_required ?? false,
              placeholder: f.placeholder ?? null,
              sort_order: f.sort_order ?? idx,
            }))
          );
        if (cfInsErr) throw cfInsErr;
      }
    }

    // リマインダー設定の全置換
    if (reminder_settings !== undefined) {
      const { error: rsDelErr } = await svc.from("reminder_settings").delete().eq("event_id", id);
      if (rsDelErr) throw rsDelErr;
      if (reminder_settings.length) {
        const { error: rsInsErr } = await svc
          .from("reminder_settings")
          .insert(reminder_settings.map((r: Record<string, unknown>) => {
            const { id: _rid, event_id: _eid, ...rest } = r as any;
            return { ...rest, event_id: id };
          }));
        if (rsInsErr) throw rsInsErr;
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    console.error("[PATCH /api/events/:id]", err);
    return serverErrorResponse();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, companyId } = await requireAuth();

    const { error } = await supabase
      .from("event_types")
      .update({ status: "archived" })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return unauthorizedResponse();
    return serverErrorResponse();
  }
}
