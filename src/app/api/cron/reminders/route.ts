import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";
import { sendMemberReminderEmail } from "@/lib/email";
import { getMemberEmailsForNotification } from "@/lib/member-notifications";

/**
 * POST /api/cron/reminders
 * リマインダーCronジョブ。15分ごとに Vercel Cron から呼び出される。
 * CRON_SECRET ヘッダーで認証。pending の booking_reminders を処理して email を送信する。
 */
export async function POST(request: Request) {
  // CRON_SECRET でリクエストを検証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ?? "noreply@pitasuke.example.com";

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
           booking_members(user_id),
           event:event_types(title, location_detail)
         ),
         reminder:reminder_settings(message)`
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
      const locationDetail = eventData?.location_detail ?? null;
      const startTimeFormatted = new Date(booking.start_time as string).toLocaleString("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const customMessage = reminder?.message || undefined;

      try {
        // 候補者へリマインダーメール
        await resend.emails.send({
          from: fromEmail,
          to: booking.candidate_email,
          subject: `【リマインダー】${eventTitle}のご確認`,
          html: `
            <p>${booking.candidate_name} 様</p>
            <p>面接のリマインダーをお送りします。</p>
            <p>
              <strong>${eventTitle}</strong><br>
              開始時刻: ${startTimeFormatted}
            </p>
            ${customMessage ? `<p>${customMessage}</p>` : ""}
            <p>よろしくお願いいたします。</p>
          `,
        });
        sent.push(item.id);
      } catch (emailErr) {
        console.error("[Cron reminders] Candidate email send failed:", emailErr);
        skipped.push(item.id);
        continue;
      }

      // 面接官へリマインダーメール（notify_reminder = true のメンバーのみ）
      const memberIds = ((booking.booking_members as any[]) ?? []).map((m: any) => m.user_id);
      if (memberIds.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
        getMemberEmailsForNotification(memberIds, "notify_reminder")
          .then((targets) =>
            Promise.all(
              targets.map(({ email }) =>
                sendMemberReminderEmail({
                  to: email,
                  candidateName: booking.candidate_name as string,
                  eventTitle,
                  startTime: booking.start_time as string,
                  endTime: booking.end_time as string,
                  locationDetail,
                  bookingUrl: `${appUrl}/bookings/${booking.id}`,
                  customMessage,
                })
              )
            )
          )
          .catch((e) => console.error("[Cron reminders] Member email error:", e));
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
