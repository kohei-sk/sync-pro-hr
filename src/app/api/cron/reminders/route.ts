import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Resend } from "resend";

/**
 * POST /api/cron/reminders
 * リマインダーCronジョブ。15分ごとに Vercel Cron から呼び出される。
 * CRON_SECRET ヘッダーで認証。pending の booking_reminders を処理して email を送信する。
 */
export async function GET(request: Request) {
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
        // 候補者へリマインダーメール
        await resend.emails.send({
          from: fromEmail,
          to: booking.candidate_email,
          subject: `【予約確認】${subjectCompany}${eventTitle}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
              ${companyName ? `<p style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">${companyName}</p>` : ""}
              <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">${eventTitle} のリマインドです</h2>
              <p style="color: #374151;">${booking.candidate_name} 様</p>
              <p style="color: #374151;">${timingStr ? `面接の ${timingStr} 前になりましたので、再度ご連絡いたします。` : "面接のリマインダーをお送りします。"}</p>

              ${customMessage ? `
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="color: #374151; white-space: pre-line;">${customMessage}</p>
              ` : ""}

              <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

              <p style="font-weight: 600; margin-bottom: 8px;">面接情報</p>
              <table style="width: 100%; margin: 0 0 16px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 80px; vertical-align: top;">日時</td>
                  <td style="padding: 8px 0; font-weight: 600;">${dateStr}<br>${timeStr}</td>
                </tr>
                ${companyName ? `<tr>
                  <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">主催</td>
                  <td style="padding: 8px 0;">${companyName}</td>
                </tr>` : ""}
                ${meetingUrl ? `<tr>
                  <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">参加リンク</td>
                  <td style="padding: 8px 0;">
                    <a href="${meetingUrl}" style="color: #2563eb; word-break: break-all;">${meetingUrl}</a>
                  </td>
                </tr>` : ""}
                ${physicalLocation ? `<tr>
                  <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">場所</td>
                  <td style="padding: 8px 0;">${physicalLocation}</td>
                </tr>` : ""}
              </table>

              ${meetingUrl ? `
              <div style="margin: 20px 0;">
                <a href="${meetingUrl}"
                  style="display: inline-block; background-color: #1a73e8; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  面接に参加する
                </a>
              </div>
              ` : ""}

              <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <p style="color: #9ca3af; font-size: 12px;">Powered by Pitasuke</p>
            </div>
          `,
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
