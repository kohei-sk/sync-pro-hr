import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// ─────────────────────────────────────────────
// 招待メール
// ─────────────────────────────────────────────

interface InviteEmailOptions {
  to: string;
  inviteToken: string;
  appUrl: string;
}

export async function sendInviteEmail(options: InviteEmailOptions): Promise<void> {
  const { to, inviteToken, appUrl } = options;
  const inviteUrl = `${appUrl}/auth/invite?token=${inviteToken}`;

  if (!resend) {
    // 開発環境向け: コンソールに招待URLを出力
    console.warn("[Email] RESEND_API_KEY が未設定のためメール送信をスキップします");
    console.log(`[Email] 招待URL (開発用): ${inviteUrl}`);
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@pitasuke.com",
      to,
      subject: "【Pitasuke】チームへの招待",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Pitasuke チームへの招待</h2>
          <p style="color: #374151;">以下のボタンをクリックして、アカウントを有効化してください。</p>

          <div style="margin: 24px 0;">
            <a href="${inviteUrl}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              アカウントを有効化する
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            このリンクは7日間有効です。ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください：
          </p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${inviteUrl}</p>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Powered by Pitasuke</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] 招待メール送信に失敗しました:", err);
  }
}

// ─────────────────────────────────────────────
// 予約キャンセルメール
// ─────────────────────────────────────────────

interface BookingCancellationOptions {
  to: string;
  candidateName: string;
  eventTitle: string;
  companyName?: string;
  startTime: string;
  endTime: string;
  cancelledByAdmin?: boolean;
}

export async function sendBookingCancellationEmail(
  options: BookingCancellationOptions
): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY が未設定のためメール送信をスキップします");
    return;
  }

  const { to, candidateName, eventTitle, companyName, startTime, endTime, cancelledByAdmin = false } = options;

  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateStr = start.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const timeStr = `${start.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })} 〜 ${end.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const bodyText = cancelledByAdmin
    ? `誠に申し訳ございませんが、担当者の都合により以下の予約がキャンセルされました。`
    : `以下の予約をキャンセルしました。`;

  const subjectCompany = companyName ? `${companyName}｜` : "";

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@pitasuke.com",
      to,
      subject: `【キャンセル完了】${subjectCompany}${eventTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          ${companyName ? `<p style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">${companyName}</p>` : ""}
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">${eventTitle} のご予約がキャンセルされました</h2>
          <p style="color: #374151;">${candidateName} 様</p>
          <p style="color: #374151;">${bodyText}</p>

          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 80px; vertical-align: top;">日時</td>
              <td style="padding: 8px 0; font-weight: 600;">${dateStr}<br>${timeStr}</td>
            </tr>
            ${companyName ? `<tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">主催</td>
              <td style="padding: 8px 0;">${companyName}</td>
            </tr>` : ""}
          </table>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Powered by Pitasuke</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] キャンセルメール送信に失敗しました:", err);
  }
}

// ─────────────────────────────────────────────
// 予約確定メール
// ─────────────────────────────────────────────

interface BookingConfirmationOptions {
  to: string;
  candidateName: string;
  eventTitle: string;
  companyName?: string;
  startTime: string;
  endTime: string;
  locationDetail?: string | null;
  meetingUrl?: string;
  cancelToken: string;
}

export async function sendBookingConfirmationEmail(
  options: BookingConfirmationOptions
): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY が未設定のためメール送信をスキップします");
    return;
  }

  const { to, candidateName, eventTitle, companyName, startTime, endTime, locationDetail, meetingUrl, cancelToken } =
    options;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";

  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateStr = start.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const timeStr = `${start.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })} 〜 ${end.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  const cancelUrl = `${appUrl}/cancel/${cancelToken}`;

  const subjectCompany = companyName ? `${companyName}｜` : "";

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@pitasuke.com",
      to,
      subject: `【予約確定】${subjectCompany}${eventTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          ${companyName ? `<p style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">${companyName}</p>` : ""}
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">${eventTitle} のご予約が確定しました</h2>
          <p style="color: #374151;">${candidateName} 様</p>
          <p style="color: #374151;">以下の日程で予約が確定しました。</p>

          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 80px; vertical-align: top;">日時</td>
              <td style="padding: 8px 0; font-weight: 600;">${dateStr}<br>${timeStr}</td>
            </tr>
            ${companyName ? `<tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">主催</td>
              <td style="padding: 8px 0;">${companyName}</td>
            </tr>` : ""}
            ${locationDetail ? `<tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">場所</td>
              <td style="padding: 8px 0;">${locationDetail}</td>
            </tr>` : ""}
            ${meetingUrl ? `<tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">参加リンク</td>
              <td style="padding: 8px 0;">
                <a href="${meetingUrl}" style="color: #2563eb; word-break: break-all;">${meetingUrl}</a>
              </td>
            </tr>` : ""}
          </table>

          ${meetingUrl ? `
<div style="margin: 20px 0;">
  <a href="${meetingUrl}"
     style="display: inline-block; background-color: #1a73e8; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
    Google Meet で参加する
  </a>
</div>
` : ""}

          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            日程のキャンセルは
            <a href="${cancelUrl}" style="color: #2563eb;">こちら</a>
            から行えます。
          </p>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Powered by Pitasuke</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] 確認メール送信に失敗しました:", err);
  }
}

// ─────────────────────────────────────────────
// 面接官向け: 予約完了通知メール
// ─────────────────────────────────────────────

interface MemberBookingNewOptions {
  to: string;
  candidateName: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  locationDetail?: string | null;
  bookingUrl: string;
}

export async function sendMemberBookingNewEmail(
  options: MemberBookingNewOptions
): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY が未設定のためメール送信をスキップします");
    return;
  }

  const { to, candidateName, eventTitle, startTime, endTime, locationDetail, bookingUrl } = options;
  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateStr = start.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeStr = `${start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 〜 ${end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@pitasuke.com",
      to,
      subject: `【新規予約】${candidateName} さんが ${eventTitle} を予約しました`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">新しい予約が入りました</h2>
          <p style="color: #374151;"><strong>${candidateName}</strong> さんが <strong>${eventTitle}</strong> を予約しました。</p>

          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 80px; vertical-align: top;">日時</td>
              <td style="padding: 8px 0; font-weight: 600;">${dateStr}<br>${timeStr}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">候補者</td>
              <td style="padding: 8px 0;">${candidateName}</td>
            </tr>
            ${locationDetail ? `<tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">場所</td>
              <td style="padding: 8px 0;">${locationDetail}</td>
            </tr>` : ""}
          </table>

          <div style="margin: 24px 0;">
            <a href="${bookingUrl}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              予約詳細を確認する
            </a>
          </div>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Powered by Pitasuke</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] 面接官向け予約完了メール送信に失敗しました:", err);
  }
}

// ─────────────────────────────────────────────
// 面接官向け: 予約キャンセル通知メール
// ─────────────────────────────────────────────

interface MemberCancellationOptions {
  to: string;
  candidateName: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  cancelledByAdmin?: boolean;
}

export async function sendMemberCancellationEmail(
  options: MemberCancellationOptions
): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY が未設定のためメール送信をスキップします");
    return;
  }

  const { to, candidateName, eventTitle, startTime, endTime, cancelledByAdmin = false } = options;
  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateStr = start.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeStr = `${start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 〜 ${end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;

  const reason = cancelledByAdmin ? "管理者によりキャンセルされました" : "候補者によりキャンセルされました";

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@pitasuke.com",
      to,
      subject: `【キャンセル】${candidateName} さんの ${eventTitle} がキャンセルされました`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">予約がキャンセルされました</h2>
          <p style="color: #374151;"><strong>${candidateName}</strong> さんの <strong>${eventTitle}</strong> の予約が${reason}。</p>

          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 80px; vertical-align: top;">日時</td>
              <td style="padding: 8px 0; font-weight: 600;">${dateStr}<br>${timeStr}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">候補者</td>
              <td style="padding: 8px 0;">${candidateName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">理由</td>
              <td style="padding: 8px 0;">${reason}</td>
            </tr>
          </table>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Powered by Pitasuke</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] 面接官向けキャンセルメール送信に失敗しました:", err);
  }
}

// ─────────────────────────────────────────────
// 面接官向け: リマインダーメール
// ─────────────────────────────────────────────

interface MemberReminderOptions {
  to: string;
  candidateName: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  locationDetail?: string | null;
  bookingUrl: string;
  customMessage?: string;
}

export async function sendMemberReminderEmail(
  options: MemberReminderOptions
): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY が未設定のためメール送信をスキップします");
    return;
  }

  const { to, candidateName, eventTitle, startTime, endTime, locationDetail, bookingUrl, customMessage } = options;
  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateStr = start.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeStr = `${start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 〜 ${end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@pitasuke.com",
      to,
      subject: `【リマインダー】${candidateName} さんとの ${eventTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">面接のリマインダー</h2>
          <p style="color: #374151;"><strong>${candidateName}</strong> さんとの <strong>${eventTitle}</strong> が近づいています。</p>

          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 80px; vertical-align: top;">日時</td>
              <td style="padding: 8px 0; font-weight: 600;">${dateStr}<br>${timeStr}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">候補者</td>
              <td style="padding: 8px 0;">${candidateName}</td>
            </tr>
            ${locationDetail ? `<tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">場所</td>
              <td style="padding: 8px 0;">${locationDetail}</td>
            </tr>` : ""}
          </table>

          ${customMessage ? `<p style="color: #374151; background: #f9fafb; padding: 12px; border-radius: 8px; font-size: 14px;">${customMessage}</p>` : ""}

          <div style="margin: 24px 0;">
            <a href="${bookingUrl}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              予約詳細を確認する
            </a>
          </div>

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Powered by Pitasuke</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] 面接官向けリマインダーメール送信に失敗しました:", err);
  }
}

// ─────────────────────────────────────────────
// 面接官向け: デイリーダイジェストメール
// ─────────────────────────────────────────────

export interface DigestBooking {
  eventTitle: string;
  candidateName: string;
  startTime: string;
  endTime: string;
  locationDetail?: string | null;
  bookingUrl: string;
}

interface DailyDigestOptions {
  to: string;
  memberName: string;
  date: string; // 表示用日付文字列
  bookings: DigestBooking[];
}

export async function sendDailyDigestEmail(
  options: DailyDigestOptions
): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY が未設定のためメール送信をスキップします");
    return;
  }

  const { to, memberName, date, bookings } = options;

  const bookingRows = bookings
    .map((b) => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      const timeStr = `${start.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} 〜 ${end.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; font-weight: 600; color: #2563eb;">${timeStr}</td>
          <td style="padding: 12px 8px;">${b.eventTitle}</td>
          <td style="padding: 12px 8px;">${b.candidateName}</td>
          <td style="padding: 12px 8px; color: #6b7280; font-size: 13px;">${b.locationDetail ?? "—"}</td>
          <td style="padding: 12px 8px;">
            <a href="${b.bookingUrl}" style="color: #2563eb; font-size: 13px;">詳細</a>
          </td>
        </tr>
      `;
    })
    .join("");

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@pitasuke.com",
      to,
      subject: `【本日の面接】${date} — ${bookings.length}件`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; color: #111827;">
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">本日の面接スケジュール</h2>
          <p style="color: #6b7280; margin-top: 0;">${memberName} さん — ${date}</p>

          ${
            bookings.length === 0
              ? `<p style="color: #6b7280;">本日の面接予定はありません。</p>`
              : `
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <thead>
                <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 10px 8px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">時間</th>
                  <th style="padding: 10px 8px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">イベント</th>
                  <th style="padding: 10px 8px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">候補者</th>
                  <th style="padding: 10px 8px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">場所</th>
                  <th style="padding: 10px 8px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;"></th>
                </tr>
              </thead>
              <tbody>${bookingRows}</tbody>
            </table>
          `
          }

          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Powered by Pitasuke</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] デイリーダイジェストメール送信に失敗しました:", err);
  }
}
