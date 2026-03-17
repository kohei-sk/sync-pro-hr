"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("メールアドレスまたはパスワードが正しくありません");
        return;
      }

      router.push("/events");
      router.refresh();
    } catch {
      setError("ログインに失敗しました。もう一度お試しください");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-bold">
              <Image
                src="/common/logo.svg"
                alt="Pitasuke"
                width={190}
                height={40}
              />
            </h1>
          </div>

          {/* Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="label">
                    メールアドレス
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="input mt-1"
                    placeholder="your@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="label">
                    パスワード
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="input pr-10"
                      placeholder="パスワードを入力"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full justify-center mt-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isLoading ? "ログイン中..." : "ログイン"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <p className="fixed bottom-4 w-full text-center text-xs text-gray-400">
        © 2026 Pitasuke. All rights reserved.
      </p>
    </>
  );
}
