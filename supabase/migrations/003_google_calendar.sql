-- oauth_tokens テーブル（まだ存在しない場合）
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  token_type    TEXT NOT NULL DEFAULT 'Bearer',
  expires_at    TIMESTAMPTZ NOT NULL,
  scope         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'oauth_tokens' AND policyname = 'users can manage their own tokens'
  ) THEN
    CREATE POLICY "users can manage their own tokens"
      ON oauth_tokens FOR ALL
      USING (user_id = auth.uid());
  END IF;
END $$;

-- profiles に不足カラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_account_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_webhook_channel_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_webhook_resource_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_webhook_expiration TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_channel_name TEXT;

-- user_settings に不足カラムを追加
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS slack_notify_booking_new BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS slack_notify_booking_cancel BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS slack_notify_reminder BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS slack_notify_digest BOOLEAN NOT NULL DEFAULT false;

-- bookings にカレンダーカラムを追加
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_calendar_owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
