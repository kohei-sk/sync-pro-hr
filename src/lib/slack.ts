/**
 * Slack 連携ユーティリティ
 *
 * Slack OAuth（Incoming Webhook スコープ）を使って
 * ワークスペースの特定チャンネルに通知を送信する。
 */

const SLACK_CLIENT_ID     = process.env.SLACK_CLIENT_ID     ?? "";
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET ?? "";

/**
 * Slack OAuth 認可 URL を生成する。
 * スコープ: incoming-webhook（特定チャンネルへの通知送信のみ）
 * redirectUri はリクエストの origin から動的に生成する（ポート不一致を防ぐ）。
 */
export function buildSlackAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id:    SLACK_CLIENT_ID,
    scope:        "incoming-webhook",
    redirect_uri: redirectUri,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params}`;
}

interface SlackTokenResponse {
  ok: boolean;
  error?: string;
  incoming_webhook?: {
    url:              string;
    channel:          string;
    channel_id:       string;
    configuration_url: string;
  };
  access_token?: string;
}

/**
 * 認可コードをアクセストークン・Webhook URL に交換する。
 * POST https://slack.com/api/oauth.v2.access
 */
export async function exchangeSlackCode(code: string, redirectUri: string): Promise<{
  webhookUrl:  string;
  channelName: string;
}> {
  const params = new URLSearchParams({
    client_id:     SLACK_CLIENT_ID,
    client_secret: SLACK_CLIENT_SECRET,
    code,
    redirect_uri:  redirectUri,
  });

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params.toString(),
  });

  const data: SlackTokenResponse = await res.json();

  if (!data.ok || !data.incoming_webhook) {
    throw new Error(`Slack OAuth failed: ${data.error ?? "unknown"}`);
  }

  return {
    webhookUrl:  data.incoming_webhook.url,
    channelName: data.incoming_webhook.channel,
  };
}

/**
 * Incoming Webhook URL にメッセージを送信する。
 * エラーは呼び出し元で処理する（fire-and-forget 向けに throw する）。
 */
export async function sendSlackMessage(
  webhookUrl: string,
  text:       string
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Slack webhook request failed: ${res.status}`);
  }
}
