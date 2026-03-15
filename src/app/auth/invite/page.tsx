"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, UserCheck, AlertCircle } from "lucide-react";

/**
 * /auth/invite?token=INVITE_TOKEN
 *
 * 招待メールのリンクをクリックした後に表示されるランディングページ。
 * メールセキュリティスキャナーは自動でリンクを開くが、ボタンをクリックしないため
 * ここでボタンを押した時に初めて Supabase の magic link を生成する。
 * これにより OTP の pre-fetch 消費問題を回避する。
 */
export default function InvitePage() {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") ?? "";
    setToken(t);
    setInitialized(true);
  }, []);

  async function handleAccept() {
    if (!token) return;
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(
          data.error ??
            "招待リンクが無効または期限切れです。管理者に再招待を依頼してください。"
        );
        setIsLoading(false);
        return;
      }

      // Supabase の magic link にリダイレクト（その場で生成した新鮮なリンク）
      window.location.href = data.url;
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
      setIsLoading(false);
    }
  }

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image src="/common/logo.svg" alt="Pitasuke" width={190} height={40} />
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="mb-6">
              <h1 className="text-xl font-bold">チームへの招待</h1>
              <p className="text-sm text-gray-500 mt-1">
                ボタンをクリックしてアカウントを有効化してください
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!token ? (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  招待リンクが無効です。管理者に再招待を依頼してください。
                </span>
              </div>
            ) : (
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="btn btn-primary w-full justify-center"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                {isLoading ? "処理中..." : "アカウントを有効化する"}
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="fixed bottom-4 w-full text-center text-xs text-gray-400">
        © 2026 Pitasuke. All rights reserved.
      </p>
    </>
  );
}
