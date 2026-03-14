-- Google Calendar Webhook（プッシュ通知）チャンネル情報を profiles に追加
-- チャンネルは最大7日で期限切れになるため cron で更新する

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_webhook_channel_id  TEXT,
  ADD COLUMN IF NOT EXISTS google_webhook_resource_id TEXT,
  ADD COLUMN IF NOT EXISTS google_webhook_expiration  TIMESTAMPTZ;
