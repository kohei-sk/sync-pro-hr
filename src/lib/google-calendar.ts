/**
 * Google Calendar OAuth & API ユーティリティ
 * native fetch のみ使用（追加パッケージなし）
 */

// ============================================================
// 定数
// ============================================================

const GOOGLE_AUTH_ENDPOINT    = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT   = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_ENDPOINT  = "https://oauth2.googleapis.com/revoke";
const GOOGLE_CALENDAR_API     = "https://www.googleapis.com/calendar/v3";
const GOOGLE_USERINFO_API     = "https://www.googleapis.com/oauth2/v2/userinfo";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// ============================================================
// 型定義
// ============================================================

export interface GoogleTokens {
  access_token:  string;
  refresh_token: string;
  expires_in:    number;   // seconds
  token_type:    string;
  scope:         string;
}

export interface GoogleCalendarEvent {
  id:            string;
  summary?:      string;
  start:         { dateTime?: string; date?: string };
  end:           { dateTime?: string; date?: string };
  status?:       string;       // "confirmed" | "tentative" | "cancelled"
  transparency?: string;       // "opaque" (busy) | "transparent" (free)
}

// ============================================================
// 1. buildAuthUrl — OAuth 認可URL生成
// ============================================================
// access_type=offline で refresh_token を要求。
// prompt=consent で毎回同意画面を表示（refresh_token の再発行を保証）。
// state パラメータで CSRF 対策（HttpOnly cookie と照合する）。

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
    response_type: "code",
    scope:         SCOPES,
    access_type:   "offline",
    prompt:        "consent",
    state,
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

// ============================================================
// 2. exchangeCodeForTokens — 認可コード → トークン交換
// ============================================================

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type:    "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<GoogleTokens>;
}

// ============================================================
// 3. refreshAccessToken — アクセストークン更新
// ============================================================
// Google は refresh 時に新しい refresh_token を返すことがあるため、
// 返り値に refresh_token が含まれる場合は呼び出し元がDBを更新すること。

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token:   string;
  expires_in:     number;
  refresh_token?: string;
}> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token refresh failed: ${res.status} ${body}`);
  }
  return res.json();
}

// ============================================================
// 4. getUserEmail — 接続アカウントのメールアドレス取得
// ============================================================

export async function getUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(GOOGLE_USERINFO_API, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google userinfo failed: ${res.status}`);
  const data = await res.json();
  return (data.email as string) ?? "";
}

// ============================================================
// 5. fetchCalendarEvents — Google Calendar からイベント取得
// ============================================================
// キャンセル済み・透明（free）のイベントは除外して返す。

export async function fetchCalendarEvents(
  accessToken: string,
  timeMin: string,   // ISO 8601
  timeMax: string    // ISO 8601
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy:      "startTime",
    maxResults:   "2500",
  });
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Calendar events fetch failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  const items: GoogleCalendarEvent[] = data.items ?? [];

  // busy なイベントのみ返す（free・キャンセル済みは除外）
  return items.filter(
    (e) => e.status !== "cancelled" && e.transparency !== "transparent"
  );
}

// ============================================================
// 6. upsertCalendarEventsToDb — calendar_events テーブルに同期
// ============================================================
// timeMin 以降の google ソースイベントを削除して再挿入（冪等）。

export async function upsertCalendarEventsToDb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  userId: string,
  events: GoogleCalendarEvent[],
  timeMin: string
): Promise<void> {
  // 同期期間内の既存 google イベントを削除
  await serviceClient
    .from("calendar_events")
    .delete()
    .eq("user_id", userId)
    .eq("source", "google")
    .gte("start_time", timeMin);

  if (events.length === 0) return;

  const rows = events
    .map((e) => {
      const startRaw = e.start.dateTime ?? e.start.date;
      const endRaw   = e.end.dateTime   ?? e.end.date;
      if (!startRaw || !endRaw) return null;

      // 終日イベント（date のみ）を TIMESTAMPTZ に変換
      const start_time = e.start.dateTime
        ? startRaw
        : new Date(startRaw + "T00:00:00+09:00").toISOString();
      const end_time = e.end.dateTime
        ? endRaw
        : new Date(endRaw + "T00:00:00+09:00").toISOString();

      return {
        user_id:    userId,
        title:      e.summary ?? "予定あり",
        start_time,
        end_time,
        source:     "google" as const,
      };
    })
    .filter(Boolean);

  if (rows.length > 0) {
    await serviceClient.from("calendar_events").insert(rows);
  }
}

// ============================================================
// 7. getValidAccessToken — 有効なアクセストークンを取得
// ============================================================
// 期限切れ（または5分以内に期限切れ）なら自動リフレッシュしてDBを更新する。
// cron ジョブや sync エンドポイントから呼び出す共通ユーティリティ。

export async function getValidAccessToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceClient: any,
  userId: string
): Promise<string> {
  const { data: tokenRow, error } = await serviceClient
    .from("oauth_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (error || !tokenRow) {
    throw new Error(`No Google token found for user ${userId}`);
  }

  const expiresAt  = new Date(tokenRow.expires_at);
  const bufferMs   = 5 * 60 * 1000; // 5分のバッファ
  if (expiresAt.getTime() - Date.now() > bufferMs) {
    return tokenRow.access_token as string;
  }

  // トークンをリフレッシュ
  const refreshed = await refreshAccessToken(tokenRow.refresh_token as string);
  const newExpires = new Date(Date.now() + refreshed.expires_in * 1000);

  const updatePayload: Record<string, string> = {
    access_token: refreshed.access_token,
    expires_at:   newExpires.toISOString(),
  };
  if (refreshed.refresh_token) {
    updatePayload.refresh_token = refreshed.refresh_token;
  }

  await serviceClient
    .from("oauth_tokens")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("provider", "google");

  return refreshed.access_token;
}

// ============================================================
// 8. revokeToken — Google のトークンを失効させる（ベストエフォート）
// ============================================================

export function revokeToken(token: string): void {
  fetch(`${GOOGLE_REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
    method: "POST",
  }).catch(() => {
    // 失敗しても無視（接続解除はDB側で完結させる）
  });
}

// ============================================================
// 9. registerWebhookChannel — Google Calendar プッシュ通知チャンネルを登録
// ============================================================
// Google がカレンダーの変更を検知すると webhookUrl へ POST を送信する。
// token に userId をセットし、X-Goog-Channel-Token ヘッダーでユーザーを識別する。
// チャンネルの最大有効期限は7日（604800秒）。HTTPS URL のみ受け付ける。

export async function registerWebhookChannel(
  accessToken: string,
  userId: string,
  webhookUrl: string
): Promise<{ channelId: string; resourceId: string; expiration: string }> {
  const channelId = crypto.randomUUID();
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/watch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        token: userId,              // X-Goog-Channel-Token でユーザーを識別
        params: { ttl: "604800" }, // 7日（Google の最大値）
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Failed to register webhook channel: ${JSON.stringify(err)}`
    );
  }
  const data = await res.json();
  return {
    channelId:  data.id as string,
    resourceId: data.resourceId as string,
    expiration: new Date(Number(data.expiration)).toISOString(),
  };
}

// ============================================================
// 10. stopWebhookChannel — Google Calendar プッシュ通知チャンネルを停止
// ============================================================
// 接続解除時・チャンネル更新時に呼び出す（ベストエフォート）。

export async function stopWebhookChannel(
  accessToken: string,
  channelId: string,
  resourceId: string
): Promise<void> {
  await fetch(`${GOOGLE_CALENDAR_API}/channels/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: channelId, resourceId }),
  }).catch(() => {
    // チャンネルが既に期限切れの場合も無視
  });
}

// ============================================================
// 11. createCalendarEvent — カレンダーイベントを作成（Google Meet 対応）
// ============================================================
// createMeet=true かつ location_detail が未設定の場合に Google Meet リンクを自動生成する。
// sendUpdates="all" で全参加者にメール通知を送信。

export interface CreateCalendarEventOptions {
  accessToken:     string;
  summary:         string;
  description:     string;
  startTime:       string;  // ISO 8601
  endTime:         string;  // ISO 8601
  attendeeEmails:  string[];
  location?:       string;
  createMeet?:     boolean;
  timeZone?:       string;
}

export interface CreatedCalendarEvent {
  eventId:   string;
  meetLink?: string;
  htmlLink?: string;
}

export async function createCalendarEvent(
  options: CreateCalendarEventOptions
): Promise<CreatedCalendarEvent> {
  const {
    accessToken,
    summary,
    description,
    startTime,
    endTime,
    attendeeEmails,
    location,
    createMeet = false,
    timeZone = "Asia/Tokyo",
  } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = {
    summary,
    description,
    start: { dateTime: startTime, timeZone },
    end:   { dateTime: endTime,   timeZone },
    attendees: attendeeEmails.map((email) => ({ email })),
    reminders: { useDefault: true },
  };

  if (location) body.location = location;

  if (createMeet) {
    body.conferenceData = {
      createRequest: {
        requestId:             crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const conferenceDataVersion = createMeet ? 1 : 0;
  const url = `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=${conferenceDataVersion}&sendUpdates=all`;

  const res = await fetch(url, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create calendar event: ${res.status} ${err}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meetLink = data.conferenceData?.entryPoints?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ep: any) => ep.entryPointType === "video"
  )?.uri as string | undefined;

  return {
    eventId:  data.id  as string,
    meetLink,
    htmlLink: data.htmlLink as string | undefined,
  };
}

// ============================================================
// 12. deleteCalendarEvent — カレンダーイベントを削除（予約キャンセル時）
// ============================================================
// 404/410 はすでに削除済みとみなして無視する。
// sendUpdates="all" で全参加者にキャンセル通知を送信。

export async function deleteCalendarEvent(
  accessToken: string,
  eventId:     string
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method:  "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  // 404 / 410 = すでに削除済み、問題なし
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const err = await res.text();
    throw new Error(`Failed to delete calendar event: ${res.status} ${err}`);
  }
}
