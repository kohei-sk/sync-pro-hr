-- ============================================================
-- Migration: Google Calendar OAuth サポート
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. oauth_tokens テーブル
CREATE TABLE oauth_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type    TEXT NOT NULL DEFAULT 'Bearer',
  expires_at    TIMESTAMPTZ NOT NULL,
  scope         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- updated_at 自動更新トリガー（update_updated_at() は schema.sql で定義済み）
CREATE TRIGGER oauth_tokens_updated_at
  BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 有効化（service role key はバイパスするので cron も問題なし）
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage their own oauth tokens"
  ON oauth_tokens FOR ALL
  USING (user_id = auth.uid());

-- 2. profiles テーブルに Google アカウント表示用カラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_account_email TEXT;
