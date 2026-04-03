import { Resend } from "resend";
import { getAppUrl } from "@/lib/app-url";

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
      subject: `【キャンセル完了】${subjectCompany}｜${eventTitle}`,
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
  const appUrl = getAppUrl();

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

          <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
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
// 候補者向け: リマインドメール
// ─────────────────────────────────────────────

interface CandidateReminderOptions {
  to: string;
  candidateName: string;
  eventTitle: string;
  companyName?: string | null;
  startTime: string;
  endTime: string;
  locationType?: string | null;
  locationDetail?: string | null;
  meetingUrl?: string | null;
  timingStr?: string;
  customMessage?: string;
  isTest?: boolean;
}

export async function sendCandidateReminderEmail(
  options: CandidateReminderOptions
): Promise<void> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY が未設定のためメール送信をスキップします");
    return;
  }

  const {
    to, candidateName, eventTitle, companyName, startTime, endTime,
    locationType, locationDetail, meetingUrl: rawMeetingUrl, timingStr, customMessage, isTest = false,
  } = options;

  const start = new Date(startTime);
  const end = new Date(endTime);

  const dateStr = start.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric", weekday: "long",
  });
  const timeStr = `${start.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })} 〜 ${end.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" })}`;

  const meetingUrl: string | null =
    rawMeetingUrl ?? (locationType === "online" ? (locationDetail ?? null) : null);
  const physicalLocation: string | null =
    locationType !== "online" ? (locationDetail ?? null) : null;

  const subjectCompany = companyName ? `${companyName}｜` : "";
  const subjectPrefix = isTest ? "【テスト送信】" : "";

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@pitasuke.com",
      to,
      subject: `${subjectPrefix}【予約確認】${subjectCompany}${eventTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
          ${isTest ? `<p style="background:#fef9c3; border:1px solid #fde68a; border-radius:6px; padding:8px 12px; font-size:13px; margin-bottom:16px;">⚠️ これはテスト送信です</p>` : ""}
          ${companyName ? `<p style="color: #6b7280; font-size: 13px; margin-bottom: 4px;">${companyName}</p>` : ""}
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">${eventTitle} のリマインドです</h2>
          <p style="color: #374151;">${candidateName} 様</p>
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
  } catch (err) {
    console.error("[Email] リマインドメール送信に失敗しました:", err);
    throw err;
  }
}
