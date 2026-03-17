import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSlackMessage } from "@/lib/slack";

/**
 * GET /api/public/cancel/[token]
 * キャンセルトークンで予約情報を取得する（候補者向け）。
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id, candidate_name, candidate_email, start_time, end_time, status,
        event_types(title, location_type, location_detail, duration)
      `
      )
      .eq("cancel_token", params.token)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "予約が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/public/cancel/[token]
 * キャンセルトークンで予約をキャンセルする（候補者向け）。
 */
export async function POST(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServiceClient();

    // まずトークンで予約を取得
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status, candidate_name, event_id, event_types(title, company_id)")
      .eq("cancel_token", params.token)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: "予約が見つかりません" },
        { status: 404 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "この予約はすでにキャンセルされています" },
        { status: 400 }
      );
    }

    // キャンセル処理
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
      })
      .eq("id", booking.id);

    if (updateError) {
      return NextResponse.json(
        { error: "キャンセルに失敗しました" },
        { status: 500 }
      );
    }

    // 担当メンバーへ通知
    const eventTypes = booking.event_types as any;
    const eventTitle = eventTypes?.title || "";
    const companyId = eventTypes?.company_id;

    const { data: assignedMembers } = await supabase
      .from("booking_members")
      .select("user_id")
      .eq("booking_id", booking.id);

    if (companyId && assignedMembers && assignedMembers.length > 0) {
      await supabase.from("notifications").insert(
        assignedMembers.map((m) => ({
          company_id: companyId,
          user_id: m.user_id,
          type: "booking_cancelled",
          booking_id: booking.id,
          candidate_name: booking.candidate_name,
          event_title: eventTitle,
          message: `${booking.candidate_name} さんが ${eventTitle} の予約をキャンセルしました`,
        }))
      );
    }

    if (companyId) {
      await supabase.from("activity_log").insert({
        company_id: companyId,
        type: "booking_candidate_cancelled",
        description: `${booking.candidate_name} さんが ${eventTitle} の予約をキャンセルしました`,
        metadata: { booking_id: booking.id, cancelled_by: "candidate" },
      });
    }

    // Slack 通知（fire-and-forget）
    if (assignedMembers && assignedMembers.length > 0) {
      const text = `【キャンセル】${booking.candidate_name} さんが「${eventTitle}」の予約をキャンセルしました`;
      sendSlackCancelNotification(supabase, assignedMembers.map((m) => m.user_id), text)
        .catch((e) => console.error("[Cancel] Slack notification error:", e));
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function sendSlackCancelNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userIds: string[],
  text: string
): Promise<void> {
  for (const userId of userIds) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("slack_status, slack_webhook_url")
      .eq("id", userId)
      .single();

    if (profile?.slack_status !== "connected" || !profile.slack_webhook_url) continue;

    const { data: settings } = await supabase
      .from("user_settings")
      .select("slack_notify_booking_cancel")
      .eq("user_id", userId)
      .single();

    if (!settings?.slack_notify_booking_cancel) continue;

    await sendSlackMessage(profile.slack_webhook_url, text);
  }
}
