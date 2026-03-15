"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type BookingInfo = {
  id: string;
  candidate_name: string;
  candidate_email: string;
  start_time: string;
  end_time: string;
  status: string;
  event_types: {
    title: string;
    location_type: string;
    location_detail?: string;
    duration: number;
  } | null;
};

export default function CancelPage() {
  const params = useParams();
  const token = params.token as string;

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/cancel/${token}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setBooking(data);
          if (data.status === "cancelled") setCancelled(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/cancel/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "キャンセルに失敗しました");
      } else {
        setCancelled(true);
      }
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setCancelling(false);
    }
  }

  const event = booking?.event_types;
  const start = booking ? new Date(booking.start_time) : null;
  const end = booking ? new Date(booking.end_time) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="flex justify-center mb-6">
          <Image src="/common/logo.svg" alt="Pitasuke" width={100} height={40} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
          {/* ローディング */}
          {loading && (
            <div className="flex flex-col items-center py-10 gap-3 text-gray-400">
              <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-primary-600 animate-spin" />
              <p className="text-sm">読み込み中...</p>
            </div>
          )}

          {/* 予約が見つからない */}
          {!loading && notFound && (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <XCircle className="h-12 w-12 text-red-400" />
              <h1 className="text-base font-semibold text-gray-800">
                予約が見つかりません
              </h1>
              <p className="text-sm text-gray-500">
                リンクが無効か、すでに削除された予約です。
              </p>
            </div>
          )}

          {/* キャンセル完了 */}
          {!loading && !notFound && cancelled && (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h1 className="text-lg font-semibold text-gray-800">
                予約をキャンセルしました
              </h1>
              {booking && (
                <p className="text-sm text-gray-500">
                  {booking.candidate_name} さんの予約はキャンセル済みです。
                </p>
              )}
            </div>
          )}

          {/* 予約情報 + キャンセルボタン */}
          {!loading && !notFound && !cancelled && booking && (
            <>
              <h1 className="text-base font-semibold text-gray-900 mb-4">
                予約のキャンセル
              </h1>

              {/* 予約詳細 */}
              <div className="rounded-xl bg-gray-50 p-4 mb-5 space-y-2.5">
                <p className="text-sm font-medium text-gray-800">{event?.title}</p>
                {start && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>
                      {start.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "long",
                      })}
                    </span>
                  </div>
                )}
                {start && end && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                    <span>
                      {start.toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      〜{" "}
                      {end.toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      　({event?.duration}分)
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 mb-5">
                上記の予約をキャンセルしてよろしいですか？この操作は取り消せません。
              </p>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn btn-primary w-full"
                style={{ backgroundColor: "#ef4444", borderColor: "#ef4444" }}
              >
                {cancelling ? "キャンセル処理中..." : "予約をキャンセルする"}
              </button>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Powered by Pitasuke
        </p>
      </div>
    </div>
  );
}
