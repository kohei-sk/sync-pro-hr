import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Service Role クライアント
 * RLS をバイパスするため、認証不要な公開 API エンドポイントで使用する
 * サーバーサイド（Route Handler）専用。ブラウザには公開しないこと。
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
