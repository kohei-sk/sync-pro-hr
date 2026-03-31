import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, serverErrorResponse } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { sendCandidateReminderEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/events/[id]/reminders/test
 * リマインドメールのテスト送信。ログイン中のユーザーのメールアドレスに送信する。
 * Body: { reminder_id: string }
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { user, supabase, companyId } = await requireAuth();
    const { id: eventId } = await params;
    const { reminder_id } = await request.json();

    if (!reminder_id) {
      return NextResponse.json({ error: "reminder_id is required" }, { status: 400 });
    }

    // イベント情報を取得（自社のイベントのみ）
    const { data: event, error: eventError } = await supabase
      .from("event_types")
      .select("id, title, location_type, location_detail, companies(name)")
      .eq("id", eventId)
      .eq("company_id", companyId)
      .single();

    if (eventError || !event) {
      return unauthorizedResponse();
    }

    // リマインド設定を取得（service client でイベントに紐づくか確認）
    const serviceClient = createServiceClient();
    const { data: reminder, error: reminderError } = await serviceClient
      .from("reminder_settings")
      .select("message, timing")
      .eq("id", reminder_id)
      .eq("event_id", eventId)
      .single();

    if (reminderError || !reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    const timing = reminder.timing as { value: number; unit: "hours" | "days" };
    const timingStr = `${timing.value}${timing.unit === "hours" ? "時間" : "日"}`;
    const customMessage = (reminder.message as string)?.trim() || undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyName = (event.companies as any)?.name ?? null;

    // テスト用のダミー日時（翌日10:00〜11:00 JST）
    const now = new Date();
    const testStart = new Date(now);
    testStart.setDate(testStart.getDate() + 1);
    testStart.setHours(10, 0, 0, 0);
    const testEnd = new Date(testStart);
    testEnd.setHours(11, 0, 0, 0);

    const toEmail = user.email!;

    await sendCandidateReminderEmail({
      to: toEmail,
      candidateName: "テスト 候補者",
      eventTitle: event.title,
      companyName,
      startTime: testStart.toISOString(),
      endTime: testEnd.toISOString(),
      locationType: event.location_type,
      locationDetail: event.location_detail,
      meetingUrl: null,
      timingStr,
      customMessage,
      isTest: true,
    });

    return NextResponse.json({ ok: true, sent_to: toEmail });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("[Reminder test] Error:", err);
    return serverErrorResponse();
  }
}
