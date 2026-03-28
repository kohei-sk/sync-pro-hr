"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * /auth/magic-link?next=PATH
 *
 * generateLink(type:'magiclink') が返すリンクのコールバックページ。
 * Supabase implicit flow では tokens が URL ハッシュ（#）に入って届くが、
 * サーバーサイドの Route Handler はハッシュを読めないため、
 * クライアントサイドのページでセッションをセットする。
 *
 * フロー:
 *   Supabase magic link
 *   → /auth/magic-link?next=/auth/accept-invite#access_token=...&refresh_token=...
 *   → このページが hash を読んで setSession()
 *   → /auth/accept-invite へリダイレクト
 */
function MagicLinkCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    const next = searchParams.get("next") ?? "/events";

    // URL ハッシュからトークンを取得
    const hash = window.location.hash.substring(1); // "#" を除去
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const errorCode = params.get("error_code");

    if (errorCode) {
      console.error("[magic-link] Auth error:", errorCode, params.get("error_description"));
      router.replace("/login?error=auth_failed");
      return;
    }

    if (!accessToken || !refreshToken) {
      console.error("[magic-link] No tokens in hash");
      router.replace("/login?error=auth_failed");
      return;
    }

    // ハッシュトークンからセッションを確立
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          console.error("[magic-link] setSession error:", error);
          router.replace("/login?error=auth_failed");
        } else {
          router.replace(next);
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function MagicLinkCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">認証中...</p>
        <Suspense>
          <MagicLinkCallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
