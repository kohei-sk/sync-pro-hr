-- ============================================================
-- Migration: Slack 連携サポート
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. profiles テーブルに Slack カラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_status       TEXT CHECK (slack_status IN ('connected', 'not_connected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_webhook_url  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slack_channel_name TEXT;

-- 2. user_settings テーブルに Slack 通知設定カラムを追加
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS slack_notify_booking_new    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS slack_notify_booking_cancel BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS slack_notify_reminder       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS slack_notify_digest         BOOLEAN NOT NULL DEFAULT false;
