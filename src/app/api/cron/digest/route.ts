import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendDailyDigestEmail, type DigestBooking } from "@/lib/email";

/**
 * POST /api/cron/digest
 * デイリーダイジェスト Cron。毎朝 7:00 JST（22:00 UTC）に Vercel Cron から呼び出される。
 * - notify_digest = true のユーザーに当日の面接一覧をメール送信。
 * - CRON_SECRET ヘッダーで認証。
 */
export async function POST(request: Request) {
  // CRON_SECRET でリクエストを検証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";

  // 本日の JST 範囲（00:00 〜 23:59:59）を UTC で計算
  const nowJst = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const todayJst = new Date(nowJst);
  todayJst.setHours(0, 0, 0, 0);
  const tomorrowJst = new Date(todayJst);
  tomorrowJst.setDate(tomorrowJst.getDate() + 1);

  // JST 日付文字列
  const dateLabel = todayJst.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  // UTC に戻す（Supabase は UTC で保存）
  const offsetMs = 9 * 60 * 60 * 1000;
  const todayUtc = new Date(todayJst.getTime() - offsetMs).toISOString();
  const tomorrowUtc = new Date(tomorrowJst.getTime() - offsetMs).toISOString();

  try {
    // notify_digest = true のユーザーを取得
    const { data: digestUsers, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("notify_digest", true);

    if (settingsError) throw settingsError;
    if (!digestUsers || digestUsers.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const userIds = digestUsers.map((s) => s.user_id);

    // 対象ユーザーがアサインされている本日の確定予約を取得
    const { data: bookingMembers, error: bmError } = await supabase
      .from("booking_members")
      .select(
        `user_id,
         booking:bookings(
           id, start_time, end_time, candidate_name, status,
           event_types(title, location_detail)
         )`
      )
      .in("user_id", userIds)
      .gte("bookings.start_time", todayUtc)
      .lt("bookings.start_time", tomorrowUtc);

    if (bmError) throw bmError;

    // ユーザーごとに予約をグループ化
    const bookingsByUser = new Map<string, DigestBooking[]>();
    for (const bm of bookingMembers ?? []) {
      const booking = bm.booking as any;
      if (!booking || booking.status !== "confirmed") continue;

      const event = booking.event_types as any;
      const entry: DigestBooking = {
        eventTitle: event?.title ?? "面接",
        candidateName: booking.candidate_name,
        startTime: booking.start_time,
        endTime: booking.end_time,
        locationDetail: event?.location_detail ?? null,
        bookingUrl: `${appUrl}/bookings/${booking.id}`,
      };

      const list = bookingsByUser.get(bm.user_id) ?? [];
      list.push(entry);
      bookingsByUser.set(bm.user_id, list);
    }

    // 各ユーザーのメールアドレスを取得
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const emailMap = new Map(
      (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""])
    );

    // プロフィール（名前）を取得
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    const nameMap = new Map(
      (profiles ?? []).map((p: any) => [p.id, p.full_name as string])
    );

    // ダイジェストメール送信（予約がないユーザーには送らない）
    let sent = 0;
    for (const userId of userIds) {
      const bookings = bookingsByUser.get(userId);
      if (!bookings || bookings.length === 0) continue;

      const email = emailMap.get(userId);
      if (!email) continue;

      // 時刻順にソート
      bookings.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      await sendDailyDigestEmail({
        to: email,
        memberName: nameMap.get(userId) ?? "担当者",
        date: dateLabel,
        bookings,
      });
      sent++;
    }

    console.log(`[Cron digest] sent=${sent}`);
    return NextResponse.json({ sent });
  } catch (err) {
    console.error("[Cron digest] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
