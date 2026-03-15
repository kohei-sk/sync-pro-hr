import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendBookingConfirmationEmail } from "@/lib/email";
import type { TimeSlot } from "@/types";

/**
 * POST /api/public/events/[slug]/bookings
 * 認証不要。候補者が予約を確定する際に呼び出す。
 * - bookings テーブルに保存
 * - booking_members にアサイン
 * - booking_reminders を設定
 * - notifications を担当メンバー分作成
 * - Resend で確認メール送信
 */
export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const {
      candidate_name,
      candidate_email,
      candidate_phone,
      selected_slot,
      custom_field_values,
    } = body as {
      candidate_name: string;
      candidate_email: string;
      candidate_phone?: string;
      selected_slot: TimeSlot;
      custom_field_values?: Record<string, string>;
    };

    if (!candidate_name || !candidate_email || !selected_slot?.start || !selected_slot?.end) {
      return NextResponse.json(
        { error: "必須フィールドが不足しています" },
        { status: 400 }
      );
    }

    if (new Date(selected_slot.start) < new Date()) {
      return NextResponse.json(
        { error: "過去の日時には予約できません" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // イベント取得（ロール・メンバー・リマインド設定含む）
    const { data: event, error: eventError } = await supabase
      .from("event_types")
      .select(
        `
        id, title, company_id, scheduling_mode, location_detail, weekday_schedule,
        reminder_settings(*),
        event_roles(
          id, name, required_count, priority_order,
          event_members(id, role_id, user_id)
        )
      `
      )
      .eq("slug", params.slug)
      .eq("status", "active")
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const roles = (event.event_roles as any[]) || [];
    const members = roles.flatMap((r) => (r.event_members as any[]) || []);

    // スケジューリングモードに応じてアサインするメンバーを決定
    let assignedMembers: { user_id: string; role_id: string | null }[] = [];

    if (event.scheduling_mode === "fixed") {
      // 固定モード：全メンバーをアサイン
      assignedMembers = members.map((m: any) => ({
        user_id: m.user_id,
        role_id: m.role_id,
      }));
    } else if (event.scheduling_mode === "pool") {
      // プールモード：各ロールで required_count 人を選ぶ
      for (const role of roles) {
        const roleData = selected_slot.available_members?.find(
          (am) => am.role_id === role.id
        );
        const availableIds = roleData?.available_user_ids || [];
        const count = Math.min(role.required_count, availableIds.length);
        for (let i = 0; i < count; i++) {
          assignedMembers.push({ user_id: availableIds[i], role_id: role.id });
        }
      }
    } else if (event.scheduling_mode === "weekday") {
      // 曜日モード：weekday_schedule から担当を決定（event_roles 不要）
      const startDate = new Date(selected_slot.start);
      const dayIndex = (startDate.getDay() + 6) % 7; // 0=月〜6=日
      const schedule = (event.weekday_schedule as any[])?.find(
        (s) => s.day_index === dayIndex
      );
      if (schedule?.member_ids?.length > 0) {
        // その曜日の担当者全員をアサイン（role_id は NULL）
        assignedMembers = schedule.member_ids.map((uid: string) => ({
          user_id: uid,
          role_id: null,
        }));
      }
    }

    // 予約を作成
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        event_id: event.id,
        candidate_name,
        candidate_email,
        candidate_phone: candidate_phone || null,
        start_time: selected_slot.start,
        end_time: selected_slot.end,
        status: "confirmed",
        custom_field_values: custom_field_values || null,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error("[Booking] Insert error:", bookingError);
      return NextResponse.json(
        { error: "予約の作成に失敗しました" },
        { status: 500 }
      );
    }

    // booking_members を挿入
    if (assignedMembers.length > 0) {
      await supabase.from("booking_members").insert(
        assignedMembers.map((m) => ({
          booking_id: booking.id,
          user_id: m.user_id,
          role_id: m.role_id || null,
        }))
      );
    }

    // リマインダーを booking_reminders に挿入（is_enabled なもののみ）
    const reminderSettings = (event.reminder_settings as any[]) || [];
    const enabledReminders = reminderSettings.filter((rs) => rs.is_enabled);
    if (enabledReminders.length > 0) {
      const bookingStart = new Date(selected_slot.start);
      const reminderInserts = enabledReminders.map((rs) => {
        const { value, unit } = rs.timing;
        const offsetMs =
          unit === "hours" ? value * 3_600_000 : value * 86_400_000;
        const scheduledAt = new Date(bookingStart.getTime() - offsetMs);
        return {
          booking_id: booking.id,
          reminder_id: rs.id,
          channel: rs.channel,
          scheduled_at: scheduledAt.toISOString(),
          status: "pending",
        };
      });
      await supabase.from("booking_reminders").insert(reminderInserts);
    }

    // 担当メンバーへの通知を作成
    if (assignedMembers.length > 0) {
      await supabase.from("notifications").insert(
        assignedMembers.map((m) => ({
          company_id: event.company_id,
          user_id: m.user_id,
          type: "booking_received",
          booking_id: booking.id,
          candidate_name,
          event_title: event.title,
          message: `${candidate_name} さんが ${event.title} に予約しました`,
        }))
      );
    }

    // アクティビティログ
    await supabase.from("activity_log").insert({
      company_id: event.company_id,
      type: "booking_created",
      description: `${candidate_name} さんが ${event.title} に予約しました`,
      metadata: { booking_id: booking.id },
    });

    // 確認メール送信（失敗しても予約は成功とする）
    await sendBookingConfirmationEmail({
      to: candidate_email,
      candidateName: candidate_name,
      eventTitle: event.title,
      startTime: selected_slot.start,
      endTime: selected_slot.end,
      locationDetail: event.location_detail,
      cancelToken: booking.cancel_token,
    });

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      cancel_token: booking.cancel_token,
    });
  } catch (err) {
    console.error("[Booking] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
