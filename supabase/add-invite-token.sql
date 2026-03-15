-- profiles テーブルに独自招待トークン用カラムを追加
-- Supabase の組み込み invite メールを使わず、Resend 経由で独自メールを送るため
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invite_token          TEXT,
  ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ;

-- トークン検索用インデックス
CREATE INDEX IF NOT EXISTS idx_profiles_invite_token
  ON profiles (invite_token)
  WHERE invite_token IS NOT NULL;
