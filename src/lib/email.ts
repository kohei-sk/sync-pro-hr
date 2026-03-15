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
// 予約確定メール
// ─────────────────────────────────────────────

interface BookingConfirmationOptions {
  to: string;
  candidateName: string;
  eventTitle: string;
  startTime: string;
  endTime: string;
  locationDetail?: string | null;
  cancelToken: string;
}

export async function sendBookingConfirmationEmail(
  options: BookingConfirmationOptions
): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY が未設定のためメール送信をスキップします");
    return;
  }

  const { to, candidateName, eventTitle, startTime, endTime, locationDetail, cancelToken } =
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

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@pitasuke.com",
      to,
      subject: `【予約確定】${eventTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">${eventTitle} のご予約が確定しました</h2>
          <p style="color: #374151;">${candidateName} 様</p>
          <p style="color: #374151;">以下の日程で予約が確定しました。</p>

          <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 80px; vertical-align: top;">日時</td>
              <td style="padding: 8px 0; font-weight: 600;">${dateStr}<br>${timeStr}</td>
            </tr>
            ${
              locationDetail
                ? `<tr>
              <td style="padding: 8px 0; color: #6b7280; vertical-align: top;">場所</td>
              <td style="padding: 8px 0;">${locationDetail}</td>
            </tr>`
                : ""
            }
          </table>

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
