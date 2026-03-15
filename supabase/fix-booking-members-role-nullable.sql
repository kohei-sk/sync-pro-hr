-- ============================================================
-- booking_members.role_id を NULL 許容に変更
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================
-- 原因: 曜日モード（weekday）のイベントは event_roles を持たないため、
--       booking_members.role_id に NULL が必要。
-- ============================================================

ALTER TABLE booking_members
  ALTER COLUMN role_id DROP NOT NULL;
