import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendCandidateReminderEmail } from "@/lib/email";

// GET /api/cron/reminders
// リマインダーCronジョブ。cron-job.org から定期的に呼び出される。
//
// 【cron-job.org 設定】
//   URL      : https://<your-domain>/api/cron/reminders
//   Method   : GET
//   Schedule : every 15 minutes (cron: "*/15 * * * *")
//   Headers  : Authorization: Bearer <CRON_SECRET の値>
//
// 【Vercel 環境変数】
//   CRON_SECRET : 任意のランダム文字列（cron-job.org の Authorization ヘッダーと一致させる）
//
// pending の booking_reminders を処理して候補者へリマインドメールを送信する。
export async function GET(request: Request) {
  // CRON_SECRET でリクエストを検証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  try {
    // 送信期限を過ぎた pending リマインダーを取得
    const { data: dueReminders, error: fetchError } = await serviceClient
      .from("booking_reminders")
      .select(
        `id,
         channel,
         booking:bookings(
           id,
           candidate_name,
           candidate_email,
           start_time,
           end_time,
           meeting_url,
           booking_members(user_id),
           event:event_types(title, location_type, location_detail, companies(name))
         ),
         reminder:reminder_settings(message, timing)`
      )
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    const sent: string[] = [];
    const skipped: string[] = [];

    for (const item of dueReminders ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const booking = item.booking as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reminder = item.reminder as any;

      if (!booking?.candidate_email) {
        skipped.push(item.id);
        continue;
      }

      const eventData = booking.event as any;
      const eventTitle = eventData?.title ?? "面接";
      const companyName: string | null = eventData?.companies?.name ?? null;
      const locationType: string | null = eventData?.location_type ?? null;
      const locationDetail: string | null = eventData?.location_detail ?? null;
      const meetingUrl: string | null =
        (booking.meeting_url as string | null) ??
        (locationType === "online" ? locationDetail : null);
      const physicalLocation: string | null =
        locationType !== "online" ? locationDetail : null;

      const subjectCompany = companyName ? `${companyName}｜` : "";

      const start = new Date(booking.start_time as string);
      const end = new Date(booking.end_time as string);
      const dateStr = start.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
      const timeStr = `${start.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })} 〜 ${end.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })}`;

      const timing = reminder?.timing as { value: number; unit: "hours" | "days" } | null;
      const timingStr = timing
        ? `${timing.value}${timing.unit === "hours" ? "時間" : "日"}`
        : "";

      const customMessage = reminder?.message?.trim() || undefined;

      try {
        await sendCandidateReminderEmail({
          to: booking.candidate_email,
          candidateName: booking.candidate_name as string,
          eventTitle,
          companyName,
          startTime: booking.start_time as string,
          endTime: booking.end_time as string,
          locationType,
          locationDetail,
          meetingUrl,
          timingStr,
          customMessage,
        });
        sent.push(item.id);
      } catch (emailErr) {
        console.error("[Cron reminders] Candidate email send failed:", emailErr);
        skipped.push(item.id);
        continue;
      }
    }

    // 送信済みを "sent" に、失敗を "skipped" に更新
    const now = new Date().toISOString();

    if (sent.length > 0) {
      await serviceClient
        .from("booking_reminders")
        .update({ status: "sent", sent_at: now })
        .in("id", sent);
    }

    if (skipped.length > 0) {
      await serviceClient
        .from("booking_reminders")
        .update({ status: "skipped" })
        .in("id", skipped);
    }

    console.log(`[Cron reminders] sent=${sent.length}, skipped=${skipped.length}`);

    return NextResponse.json({ sent: sent.length, skipped: skipped.length });
  } catch (err) {
    console.error("[Cron reminders] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
