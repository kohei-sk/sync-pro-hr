-- ============================================================
-- RLS 無限再帰バグ修正
-- Supabase Dashboard > SQL Editor で実行してください
-- ============================================================
-- 原因: profiles テーブルの SELECT ポリシーが自己参照して
--       infinite recursion を起こしていた。
-- 修正: SECURITY DEFINER 関数 get_my_company_id() を追加し、
--       RLS をバイパスして company_id を取得する。
-- ============================================================

-- Step 1: SECURITY DEFINER 関数（profiles を RLS なしでクエリ）
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Step 2: 再帰を起こしていたポリシーを削除して再作成
DROP POLICY IF EXISTS "users can view profiles in same company" ON profiles;

CREATE POLICY "users can view profiles in same company"
  ON profiles FOR SELECT
  USING (company_id = get_my_company_id());
